using System.Text.Json;

namespace BopRadar.Data;

public class Car
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Maker { get; set; } = "";
    public string Drivetrain { get; set; } = "";
    public string Group { get; set; } = "";
}

public class BopUpdate
{
    public string Version { get; set; } = "";
    public DateOnly Date { get; set; }
}

public class CarBopEntry
{
    public string CarId { get; set; } = "";
    public string Version { get; set; } = "";
    public string Set { get; set; } = "";
    public bool Changed { get; set; }
    public int Rank { get; set; }
    public string Tier { get; set; } = "";
    public double Pp { get; set; }
    public int PowerPs { get; set; }
    public double TorqueKgfm { get; set; }
    public int WeightKg { get; set; }
    public double? PsPerT { get; set; }
    public string Balance { get; set; } = "";
    public double Acc100150 { get; set; }
    public double Rotg60 { get; set; }
    public double Rotg120 { get; set; }
    public double Rotg240 { get; set; }
    public double StabLow { get; set; }
    public double StabHigh { get; set; }
    public string StabLowFlag { get; set; } = "";
    public string StabHighFlag { get; set; } = "";
}

public class CarUpdateNote
{
    public string CarId { get; set; } = "";
    public string Version { get; set; } = "";
    public int ClassSize { get; set; }
    public string Summary { get; set; } = "";
    public JsonDocument Context { get; set; } = null!;
}

public class UpdateChange
{
    public string Version { get; set; } = "";
    public string CarId { get; set; } = "";
    public string Verdict { get; set; } = "";
    public JsonDocument Delta { get; set; } = null!;
    public int Rank { get; set; }
    public string Summary { get; set; } = "";
    public JsonDocument Brief { get; set; } = null!;
}

public class Track
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Set { get; set; } = "";
    public JsonDocument Stats { get; set; } = null!;
}
