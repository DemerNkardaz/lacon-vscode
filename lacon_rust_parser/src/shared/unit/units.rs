use super::dimensions::Dimension;
use super::definition::PrefixGroup;
use super::definition::UnitDef;

pub static UNITS: &[UnitDef] = &[
    UnitDef::new("Hz",     Dimension::Frequency,       None,              PrefixGroup::SI, PrefixGroup::SI),
    UnitDef::new("g",      Dimension::Mass,            None,              PrefixGroup::SI, PrefixGroup::SI),
    UnitDef::new("g/m2",   Dimension::AreaDensity,     Some(("g", "m2")), PrefixGroup::SI, PrefixGroup::SI),
    UnitDef::new("g/m3",   Dimension::Density,         Some(("g", "m3")), PrefixGroup::SI, PrefixGroup::SI),
    UnitDef::new("m",      Dimension::Length,          None,              PrefixGroup::SI, PrefixGroup::SI),
    UnitDef::new("s",      Dimension::Time,            None,              PrefixGroup::SI, PrefixGroup::SI),
];