use super::dimensions::Dimension;

#[derive(Debug, Clone)]
pub enum CalcMode {
    Linear,
    Exponential,
}

#[derive(Debug, Clone)]
pub enum Formula {
    None,              // Для безразмерных величин
    Simple(Dimension), // Одна размерность (н-р, Mass)
    Complex {
        // Составная (н-р, m/s2)
        num: &'static [Dimension],
        den: &'static [Dimension],
    },
}

#[derive(Debug, Clone)]
pub struct UnitProps {
    pub scale: f64,
    pub offset: f64,
    pub mode: CalcMode,
    pub formula: Formula,
}

impl UnitProps {
    pub const DEFAULT: Self = Self {
        scale: 1.0,
        offset: 0.0,
        mode: CalcMode::Linear,
        formula: Formula::None,
    };
}
