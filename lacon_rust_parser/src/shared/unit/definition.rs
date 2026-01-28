use super::dimensions::Dimension;
use super::props::{CalcMode, UnitProps};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PrefixGroup {
    SI,
    Thermal, // Temperature
    Metric,
    None,
    Digital,
}

impl PrefixGroup {
    pub const fn regex_pattern(&self) -> &'static str {
        match self {
            PrefixGroup::SI => "(?:da|[QRYZEPTGMkhdcmμnpfazyrq])",
            PrefixGroup::Thermal => "(?:deg|°)",
            PrefixGroup::None => "",
            PrefixGroup::Metric => "",
            PrefixGroup::Digital => "",
        }
    }
}

#[derive(Debug, Clone)]
pub struct UnitDef {
    pub symbol: &'static str,
    pub dimension: Dimension,
    pub parts: Option<(&'static str, &'static str)>,
    pub props: UnitProps,
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
        props: UnitProps,
    ) -> Self {
        Self {
            symbol,
            dimension,
            parts,
            numerator_group: n_grp,
            denominator_group: d_grp,
            props,
        }
    }

    pub fn get_props(&self) -> &UnitProps {
        &self.props
    }
}

impl UnitDef {
    pub fn normalize(&self, value: f64) -> f64 {
        let props = self.get_props();

        match props.mode {
            CalcMode::Linear => (value * props.scale) + props.offset,
            CalcMode::Exponential => {
                // K = T0 * (T1 / T0)^(G / 100)
                let t0 = props.offset;
                let t1 = props.scale;
                t0 * (t1 / t0).powf(value / 100.0)
            }
        }
    }

    pub fn denormalize(&self, base_value: f64) -> f64 {
        let props = self.get_props();

        match props.mode {
            CalcMode::Linear => (base_value - props.offset) / props.scale,
            CalcMode::Exponential => {
                // G = 100 * log_{T1/T0}(K/T0)
                let t0 = props.offset;
                let t1 = props.scale;
                100.0 * (base_value / t0).log(t1 / t0)
            }
        }
    }
}

#[derive(Debug, Default)]
pub struct UnitNode {
    pub is_final: bool,
    pub children: BTreeMap<char, UnitNode>,
}

#[derive(Debug, Default)]
pub struct UnitTree {
    pub root: UnitNode,
}

impl UnitTree {
    pub fn insert(&mut self, word: &str) {
        if word.is_empty() {
            return;
        }

        let mut current_node = &mut self.root;
        for ch in word.chars() {
            // Заходим в BTreeMap и либо берем существующий узел, либо создаем новый
            current_node = current_node.children.entry(ch).or_default();
        }
        // Последний узел в цепочке помечаем как валидный юнит
        current_node.is_final = true;
    }

    pub fn longest_match(&self, input: &[char]) -> usize {
        let mut current_node = &self.root;
        let mut last_final_idx = 0;
        let mut current_idx = 0;

        for &ch in input {
            if let Some(next_node) = current_node.children.get(&ch) {
                current_node = next_node;
                current_idx += 1;

                if current_node.is_final {
                    last_final_idx = current_idx;
                }
            } else {
                break;
            }
        }

        last_final_idx
    }
}

#[macro_export]
macro_rules! units_array {
    // Обработка @multi
    (
        [$($accumulated:tt)*]
        @multi [$($symbol:expr),+] $suffix:expr, $dim:expr, ($ng:expr, $dg:expr), $props:expr,
        $($rest:tt)*
    ) => {
        units_array![
            [$($accumulated)* $(UnitDef::new(concat!($symbol, $suffix), $dim, None, $ng, $dg, $props),)+]
            $($rest)*
        ]
    };

    // Обработка обычного элемента
    (
        [$($accumulated:tt)*]
        $item:expr,
        $($rest:tt)*
    ) => {
        units_array![
            [$($accumulated)* $item,]
            $($rest)*
        ]
    };

    // Финальный случай
    (
        [$($accumulated:tt)*]
    ) => {
        &[$($accumulated)*]
    };
}
