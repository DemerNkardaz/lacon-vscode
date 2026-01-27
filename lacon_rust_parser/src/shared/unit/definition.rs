use super::dimensions::Dimension;

pub enum PrefixGroup {
    SI,
    Metric,
    None,
    Digital,
}

pub struct UnitDef {
		pub symbol: &'static str,
		pub dimension: Dimension,
		pub parts: Option<(&'static str, &'static str)>,
		pub numerator_group: PrefixGroup,
		pub denominator_group: PrefixGroup,
}

impl UnitDef {
    pub const fn new(
        symbol: &'static str,
        dimension: Dimension,
        parts: Option<(&'static str, &'static str)>,
        n_grp: PrefixGroup,
        d_grp: PrefixGroup,
    ) -> Self {
        Self {
            symbol,
            dimension,
            parts,
            numerator_group: n_grp,
            denominator_group: d_grp,
        }
    }
}