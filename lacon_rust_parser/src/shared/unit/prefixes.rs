use super::definition::PrefixGroup;

pub static PREFIXES: &[(&str, f64, PrefixGroup)] = &[
    // Положительные степени (от наибольшего к меньшему)
    ("Q", 1e30, PrefixGroup::SI), // кветта
    ("R", 1e27, PrefixGroup::SI), // ронна
    ("Y", 1e24, PrefixGroup::SI), // иотта
    ("Z", 1e21, PrefixGroup::SI), // зетта
    ("E", 1e18, PrefixGroup::SI), // экса
    ("P", 1e15, PrefixGroup::SI), // пета
    ("T", 1e12, PrefixGroup::SI), // тера
    ("G", 1e9, PrefixGroup::SI),  // гига
    ("M", 1e6, PrefixGroup::SI),  // мега
    ("k", 1e3, PrefixGroup::SI),  // кило
    ("h", 1e2, PrefixGroup::SI),  // гекто
    ("da", 1e1, PrefixGroup::SI), // дека
    // Отрицательные степени (от большего к меньшему)
    ("d", 1e-1, PrefixGroup::SI),  // деци
    ("c", 1e-2, PrefixGroup::SI),  // санти
    ("m", 1e-3, PrefixGroup::SI),  // милли
    ("μ", 1e-6, PrefixGroup::SI),  // микро
    ("n", 1e-9, PrefixGroup::SI),  // нано
    ("p", 1e-12, PrefixGroup::SI), // пико
    ("f", 1e-15, PrefixGroup::SI), // фемто
    ("a", 1e-18, PrefixGroup::SI), // атто
    ("z", 1e-21, PrefixGroup::SI), // зепто
    ("y", 1e-24, PrefixGroup::SI), // иотто
    ("r", 1e-27, PrefixGroup::SI), // ронто
    ("q", 1e-30, PrefixGroup::SI), // квекто
    // Эти — только для PrefixGroup::Digital
    ("Ki", 1024.0, PrefixGroup::Digital),
    ("Mi", 1048576.0, PrefixGroup::Digital),
    // Для Metric можно выделить сокращенный список (например, без экзотики типа "атто" или "зепто")
    ("c", 1e-2, PrefixGroup::Metric), // санти-
    ("k", 1e3, PrefixGroup::Metric),  // кило-
];