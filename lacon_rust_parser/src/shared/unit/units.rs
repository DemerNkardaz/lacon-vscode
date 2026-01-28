use super::definition::{PrefixGroup, UnitDef, UnitNode, UnitTree};
use super::dimensions::Dimension;
use super::prefixes::PREFIXES;
use super::props::{CalcMode, Formula, UnitProps};
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::sync::LazyLock;

pub static UNITS: &[UnitDef] = units_array![
    []
    UnitDef::new(
        "Hz",
        Dimension::Frequency,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[], // Пусто, так как в числителе единица
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "g",
        Dimension::Mass,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "m",
        Dimension::Length,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "s",
        Dimension::Time,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "mol",
        Dimension::Amount,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps::DEFAULT,
    ),
    //
    UnitDef::new(
        "g/m2",
        Dimension::AreaDensity,
        Some(("g", "m2")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Mass],
                den: &[Dimension::Length, Dimension::Length],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "g/m3",
        Dimension::Density,
        Some(("g", "m3")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Mass],
                den: &[Dimension::Length, Dimension::Length, Dimension::Length],
            },
            ..UnitProps::DEFAULT
        },
    ),
    //
    UnitDef::new(
        "m/s",
        Dimension::Velocity,
        Some(("m", "s")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "m/s2",
        Dimension::Acceleration,
        Some(("m", "s2")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[Dimension::Time, Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "m/s3",
        Dimension::Jerk,
        Some(("m", "s3")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[Dimension::Time, Dimension::Time, Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "m/s4",
        Dimension::Snap,
        Some(("m", "s4")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                ],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "m/s5",
        Dimension::Crackle,
        Some(("m", "s5")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                ],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "m/s6",
        Dimension::Pop,
        Some(("m", "s6")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                    Dimension::Time,
                ],
            },
            ..UnitProps::DEFAULT
        },
    ),
    //
    UnitDef::new(
        "b",
        Dimension::Size,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            scale: 0.125,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "B",
        Dimension::Size,
        None,
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "bit/s",
        Dimension::BitRate,
        Some(("bit", "s")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            scale: 0.125,
            formula: Formula::Complex {
                num: &[Dimension::Size],
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "B/s",
        Dimension::BitRate,
        Some(("B", "s")),
        PrefixGroup::SI,
        PrefixGroup::SI,
        UnitProps {
            formula: Formula::Complex {
                num: &[Dimension::Size],
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    //
    UnitDef::new(
        "t",
        Dimension::Mass,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 1e6,
            ..UnitProps::DEFAULT
        },
    ),
    //
    UnitDef::new(
        "ft",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.3048,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "mi",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 1609.344,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "in",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.0254,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "em",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "rem",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "pt",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.000352778,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "pc",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.004233333,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "px",
        Dimension::Length,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
    //
    UnitDef::new(
        "min",
        Dimension::Time,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 60.0,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "hour",
        Dimension::Time,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 3600.0,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "day",
        Dimension::Time,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 86400.0,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "week",
        Dimension::Time,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 604800.0,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "month",
        Dimension::Time,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 2629746.0,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "year",
        Dimension::Time,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 31556952.0,
            ..UnitProps::DEFAULT
        },
    ),
    //
    UnitDef::new(
        "ft/s",
        Dimension::Velocity,
        Some(("m", "s")),
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.3048,
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "mi/h",
        Dimension::Velocity,
        Some(("m", "s")),
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.44704,
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "kn",
        Dimension::Velocity,
        Some(("m", "s")),
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.514444,
            formula: Formula::Complex {
                num: &[Dimension::Length],
                den: &[Dimension::Time],
            },
            ..UnitProps::DEFAULT
        },
    ),
    //
    UnitDef::new(
        "K",
        Dimension::Temperature,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
    @multi ["deg", "\u{00B0}"] "C", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        offset: 273.15,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "F", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 5.0 / 9.0,
        offset: 255.37222222222222,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "Ra", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 5.0 / 9.0,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "N", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 100.0 / 33.0,
        offset: 273.15,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "D", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: -2.0 / 3.0,
        offset: 373.15,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "Re", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 1.25,
        offset: 273.15,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "Ro", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 40.0 / 21.0,
        offset: 258.864286,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "L", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        offset: 20.15,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "W", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 24.857191,
        offset: 542.15,
        ..UnitProps::DEFAULT
    },
    @multi ["deg", "\u{00B0}"] "Da", Dimension::Temperature, (PrefixGroup::None, PrefixGroup::None), UnitProps {
        scale: 373.15,
        offset: 273.15,
        mode: CalcMode::Exponential,
        ..UnitProps::DEFAULT
    },
    //
    UnitDef::new(
        "%",
        Dimension::Percent,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.01,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "fr",
        Dimension::Fraction,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "deg",
        Dimension::Degree,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.017453292519943295,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "\u{00B0}",
        Dimension::Degree,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps {
            scale: 0.017453292519943295,
            ..UnitProps::DEFAULT
        },
    ),
    UnitDef::new(
        "rad",
        Dimension::Radian,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
    UnitDef::new(
        "D",
        Dimension::Dimension,
        None,
        PrefixGroup::None,
        PrefixGroup::None,
        UnitProps::DEFAULT,
    ),
];

lazy_static! {
    pub static ref UNITS_TREE: LazyLock<UnitTree> = LazyLock::new(|| build_unit_tree(&UNITS));
}

pub fn build_unit_tree(units: &[UnitDef]) -> UnitTree {
    let mut tree = UnitTree::default();

    for unit in units {
        if unit.symbol.is_empty() {
            continue;
        }

        // 1. Всегда вставляем базовый символ (напр. "g/m2")
        tree.insert(unit.symbol);

        // 2. Если есть части (числитель/знаменатель), строим комбинации
        if let Some((n_base, d_base)) = unit.parts {
            // Собираем доступные префиксы для числителя и знаменателя
            // Включаем пустую строку "", чтобы учесть случаи без префикса
            let n_prefixes: Vec<&str> = PREFIXES
                .iter()
                .filter(|(_, _, g)| *g == unit.numerator_group)
                .map(|(s, _, _)| *s)
                .chain(std::iter::once(""))
                .collect();

            let d_prefixes: Vec<&str> = PREFIXES
                .iter()
                .filter(|(_, _, g)| *g == unit.denominator_group)
                .map(|(s, _, _)| *s)
                .chain(std::iter::once(""))
                .collect();

            for p_n in &n_prefixes {
                for p_d in &d_prefixes {
                    // Пропускаем случай, когда оба префикса пустые (уже вставили unit.symbol)
                    if p_n.is_empty() && p_d.is_empty() {
                        continue;
                    }

                    let full_unit = format!("{}{}/{}{}", p_n, n_base, p_d, d_base);
                    tree.insert(&full_unit);
                }
            }
        } else {
            // 3. Логика для атомарных юнитов (как была)
            if unit.numerator_group != PrefixGroup::None {
                for (p_sym, _val, p_group) in PREFIXES {
                    if *p_group == unit.numerator_group {
                        tree.insert(&format!("{}{}", p_sym, unit.symbol));
                    }
                }
            }
        }
    }

    tree
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Рекурсивная функция для отрисовки дерева
    fn print_node(node: &UnitNode, prefix: String, char_label: char) {
        // Формируем строку состояния: если узел финальный, помечаем его [F]
        let final_mark = if node.is_final { "[F]" } else { "" };

        println!("{}{}{}", prefix, char_label, final_mark);

        // Итерируемся по детям. BTreeMap гарантирует алфавитный порядок.
        let mut it = node.children.iter().peekable();
        while let Some((&ch, next_node)) = it.next() {
            let mut new_prefix = prefix.clone();
            // Рисуем красивые веточки
            if prefix.is_empty() {
                new_prefix.push_str(" ");
            } else {
                new_prefix.push_str("  ");
            }

            print_node(next_node, new_prefix, ch);
        }
    }

    #[test]
    fn test_display_unit_tree() {
        // Используем твой LazyLock (или генерируем вручную для теста)
        let tree = &*UNITS_TREE;

        println!("\n=== Unit Tree Structure ===");
        println!("(root)");

        // Запускаем отрисовку от корня
        for (&ch, node) in &tree.root.children {
            print_node(node, String::from(" ├── "), ch);
        }
        println!("===========================\n");
    }
}
