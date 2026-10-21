namespace BopRadar.Data.Import;

public record SiteData(
    IReadOnlyList<Car> Cars,
    IReadOnlyList<BopUpdate> Updates,
    IReadOnlyList<CarBopEntry> Entries,
    IReadOnlyList<CarUpdateNote> Notes,
    IReadOnlyList<UpdateChange> Changes,
    IReadOnlyList<Track> Tracks);
