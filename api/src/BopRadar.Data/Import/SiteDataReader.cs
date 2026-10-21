using System.Globalization;
using System.Text.Json;

namespace BopRadar.Data.Import;

public static class SiteDataReader
{
    public static SiteData Read(string siteDataDir)
    {
        var updates = new Dictionary<string, BopUpdate>();
        void AddUpdate(string v, string date, string file)
        {
            if (updates.ContainsKey(v)) return;
            if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                throw new SiteDataException(file, "date", $"'{date}' is not yyyy-MM-dd");
            updates[v] = new BopUpdate { Version = v, Date = d };
        }

        var cars = new List<Car>();
        var entries = new List<CarBopEntry>();
        var notes = new List<CarUpdateNote>();
        var changes = new List<UpdateChange>();
        var tracks = new List<Track>();

        var carsDir = Path.Combine(siteDataDir, "cars");
        var carFiles = Directory.Exists(carsDir) ? Directory.GetFiles(carsDir, "*.json").Order().ToArray() : [];
        if (carFiles.Length == 0) throw new SiteDataException("cars", "cars", "no car files found");
        using (var index = Load(siteDataDir, "index.json"))
            foreach (var u in Arr(index.RootElement, "updates", "index.json"))
                AddUpdate(Str(u, "version", "index.json"), Str(u, "date", "index.json"), "index.json");

        foreach (var path in carFiles)
        {
            var file = Path.GetFileName(path);
            using var doc = Parse(path, file);
            var c = doc.RootElement;
            var car = new Car
            {
                Id = Str(c, "id", file), Name = Str(c, "name", file), Maker = Str(c, "maker", file),
                Drivetrain = Str(c, "drivetrain", file), Group = Str(c, "group", file),
            };
            cars.Add(car);
            foreach (var h in Arr(c, "history", file))
            {
                var v = Str(h, "v", file);
                AddUpdate(v, Str(h, "date", file), file);
                notes.Add(new CarUpdateNote
                {
                    CarId = car.Id, Version = v, ClassSize = Int(h, "of", file),
                    Summary = Str(h, "summary", file), Context = Clone(Req(h, "context", file)),
                });
                var changedEl = Req(h, "changed", file);
                if (changedEl.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                    throw new SiteDataException(file, "changed", "expected boolean");
                var changed = changedEl.GetBoolean();
                var sets = Req(h, "sets", file);
                if (sets.ValueKind != JsonValueKind.Object) throw new SiteDataException(file, "sets", "expected object");
                foreach (var s in sets.EnumerateObject())
                {
                    var e = s.Value;
                    entries.Add(new CarBopEntry
                    {
                        CarId = car.Id, Version = v, Set = s.Name, Changed = changed,
                        Rank = Int(e, "rank", file), Tier = Str(e, "tier", file), Pp = Num(e, "pp", file),
                        PowerPs = Int(e, "power_ps", file), TorqueKgfm = Num(e, "torque_kgfm", file),
                        WeightKg = Int(e, "weight_kg", file),
                        // ps_per_t is absent in some real rows
                        PsPerT = e.TryGetProperty("ps_per_t", out _) ? Num(e, "ps_per_t", file) : null,
                        Balance = Str(e, "balance", file), Acc100150 = Num(e, "acc_100_150", file),
                        Rotg60 = Num(e, "rotg_60", file), Rotg120 = Num(e, "rotg_120", file),
                        Rotg240 = Num(e, "rotg_240", file), StabLow = Num(e, "stab_low", file),
                        StabHigh = Num(e, "stab_high", file), StabLowFlag = Str(e, "stab_low_flag", file),
                        StabHighFlag = Str(e, "stab_high_flag", file),
                    });
                }
            }
        }

        var carIds = cars.Select(c => c.Id).ToHashSet();
        var updDir = Path.Combine(siteDataDir, "updates");
        foreach (var path in Directory.Exists(updDir) ? Directory.GetFiles(updDir, "*.json").Order().ToArray() : [])
        {
            var file = Path.GetFileName(path);
            using var doc = Parse(path, file);
            var v = Str(doc.RootElement, "version", file);
            AddUpdate(v, Str(doc.RootElement, "date", file), file);
            var groups = Req(doc.RootElement, "groups", file);
            if (groups.ValueKind != JsonValueKind.Object) throw new SiteDataException(file, "groups", "expected object");
            foreach (var g in groups.EnumerateObject())
                foreach (var it in Arr(groups, g.Name, file))
                {
                    var id = Str(it, "id", file);
                    if (!carIds.Contains(id)) throw new SiteDataException(file, "id", $"unknown car '{id}'");
                    changes.Add(new UpdateChange
                    {
                        Version = v, CarId = id, Verdict = Str(it, "verdict", file),
                        Delta = Clone(Req(it, "delta", file)), Rank = Int(it, "rank", file),
                        Summary = Str(it, "summary", file), Brief = Clone(Req(it, "brief", file)),
                    });
                }
        }

        using (var tdoc = Load(siteDataDir, "tracks.json"))
        {
            if (tdoc.RootElement.ValueKind != JsonValueKind.Array)
                throw new SiteDataException("tracks.json", "tracks.json", "expected array");
            foreach (var t in tdoc.RootElement.EnumerateArray())
                tracks.Add(new Track
                {
                    Id = Str(t, "id", "tracks.json"), Name = Str(t, "name", "tracks.json"),
                    Set = Str(t, "set", "tracks.json"), Stats = Clone(Req(t, "groups", "tracks.json")),
                });
        }

        return new SiteData(cars, [.. updates.Values], entries, notes, changes, tracks);
    }

    static JsonDocument Load(string dir, string name)
    {
        var path = Path.Combine(dir, name);
        if (!File.Exists(path)) throw new SiteDataException(name, name, "file not found");
        return Parse(path, name);
    }

    static JsonDocument Parse(string path, string file)
    {
        try { return JsonDocument.Parse(File.ReadAllText(path)); }
        catch (JsonException ex) { throw new SiteDataException(file, "(json)", ex.Message); }
    }

    // Detach from the parent document, which is disposed after reading.
    static JsonDocument Clone(JsonElement e) => JsonDocument.Parse(e.GetRawText());

    static JsonElement Req(JsonElement e, string field, string file)
    {
        if (e.ValueKind != JsonValueKind.Object || !e.TryGetProperty(field, out var v) || v.ValueKind == JsonValueKind.Null)
            throw new SiteDataException(file, field, "missing required field");
        return v;
    }

    static string Str(JsonElement e, string field, string file)
    {
        var v = Req(e, field, file);
        return v.ValueKind == JsonValueKind.String ? v.GetString()! : throw new SiteDataException(file, field, "expected string");
    }

    static double Num(JsonElement e, string field, string file)
    {
        var v = Req(e, field, file);
        return v.ValueKind == JsonValueKind.Number ? v.GetDouble() : throw new SiteDataException(file, field, "expected number");
    }

    static int Int(JsonElement e, string field, string file)
    {
        var v = Req(e, field, file);
        return v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i) ? i : throw new SiteDataException(file, field, "expected integer");
    }

    static JsonElement.ArrayEnumerator Arr(JsonElement e, string field, string file)
    {
        var v = Req(e, field, file);
        return v.ValueKind == JsonValueKind.Array ? v.EnumerateArray() : throw new SiteDataException(file, field, "expected array");
    }
}
