pub enum Dimension {
    Degree,              // deg \\ AngleDegree
    Radian,              // rad \\ AngleRadian
    Percent,             // %   \\ Percentage
    Length,              // m   \\ LengthUnit
    Time,                // s   \\ TimeUnit
    Frequency,           // Hz  \\ FrequencyUnit
    Velocity,            // m/s \\ SpeedUnit
    Acceleration,        // m/s2 \\ AccelerationUnit
    Jerk,                // m/s3 \\ JerkUnit
    Snap,                // m/s4 \\ SnapUnit
    Crackle,             // m/s5 \\ CrackleUnit
    Pop,                 // m/s6 \\ PopUnit
    Size,                // B   \\ SizeUnit
    BitRate,             // bps \\ BitRate
    Mass,                // g  \\ MassUnit
    AreaDensity,         // kg/m2 \\ AreaDensity
    Density,             // kg/m3 \\ Density
    Amount,              // mol \\ Amount
    Fraction,            // /   \\ FractionUnit
    Dimension,           // DimensionalUnit
    Temperature,         // K \\ TemperatureUnit
    ElectricVoltage,     // V \\ ElectricVoltage
    ElectricCurrent,     // A \\ ElectricCurrent
    ElectricCharge,      // C \\ ElectricCharge
    ElectricResistance,  // Ω \\ ElectricResistance
    ElectricConductance, // S \\ ElectricConductance
    ElectricCapacitance, // F \\ ElectricCapacitance
    ElectricPower,       // W \\ ElectricPower
    LuminousIntensity,   // cd \\ LuminousIntensity
    LuminousFlux,        // lm \\ LuminousFlux
    Illuminance,         // lx \\ Illuminance
    Pressure,            // Pa  \\ PressureUnit
    Energy,              // J  \\ EnergyUnit
    Force,               // N  \\ ForceUnit
    Area,                // m2 \\ AreaUnit
    Volume,              // m3 \\ VolumeUnit
}
