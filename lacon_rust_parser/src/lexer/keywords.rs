use crate::lexer::token_type::TokenType;
use lazy_static::lazy_static;
use std::collections::HashMap;

lazy_static! {
    /// Полная карта ключевых слов языка Lacon.
    pub static ref KEYWORDS: HashMap<&'static str, TokenType> = {
        let mut m = HashMap::new();

        // --- Управление потоком (Control Flow) ---
        m.insert("if",         TokenType::If);
        m.insert("else",       TokenType::Else);
        m.insert("elif",       TokenType::Elif);
        m.insert("match",      TokenType::Match);
        m.insert("case",       TokenType::Case);
        m.insert("default",    TokenType::Default);
        m.insert("switch",     TokenType::Switch);
        m.insert("for",        TokenType::For);
        m.insert("while",      TokenType::While);
        m.insert("until",      TokenType::Until);
        m.insert("spread",      TokenType::Spread);
        m.insert("generate",      TokenType::Generate);
        m.insert("combine",    TokenType::Combine);
        m.insert("enumerate",  TokenType::Enumerate);
        m.insert("filter",      TokenType::Filter);
        m.insert("flatten",    TokenType::Flatten);
        m.insert("repeat",     TokenType::Repeat);
        m.insert("transform",  TokenType::Transform);
        m.insert("transpose",  TokenType::Transpose);
        m.insert("loop",       TokenType::Loop);
        m.insert("break",      TokenType::Break);
        m.insert("continue",   TokenType::Continue);
        m.insert("return",     TokenType::Return);
        m.insert("yield",      TokenType::Yield);
        m.insert("exit",       TokenType::Exit);
        m.insert("cancel",     TokenType::Cancel);
        m.insert("defer",      TokenType::Defer);

        // --- Обработка исключений ---
        m.insert("try",        TokenType::Try);
        m.insert("catch",      TokenType::Catch);
        m.insert("finally",    TokenType::Finally);
        m.insert("throw",      TokenType::Throw);

        // --- Асинхронность ---
        m.insert("async",      TokenType::Async);
        m.insert("await",      TokenType::Await);
        m.insert("coroutine",  TokenType::Coroutine);

        // --- Объявления и Структура ---
        m.insert("class",      TokenType::Class);
        m.insert("interface",  TokenType::Interface);
        m.insert("enum",       TokenType::Enum);
        m.insert("cont",       TokenType::Container);
        m.insert("function",   TokenType::Function);
        m.insert("procedure",  TokenType::Procedure);
        m.insert("let",        TokenType::Variable);
        m.insert("const",      TokenType::Constant);
        m.insert("import",     TokenType::Import);
        m.insert("export",     TokenType::Export);
        m.insert("from",       TokenType::From);
        m.insert("include",    TokenType::Include);

        // --- Типовая система ---
        m.insert("type",       TokenType::Type);
        m.insert("auto",       TokenType::Auto);
        m.insert("alias",      TokenType::Alias);
        m.insert("as",         TokenType::As);
        m.insert("is",         TokenType::Is);
        m.insert("extends",    TokenType::Extends);
        m.insert("implements", TokenType::Implements);
        m.insert("in",         TokenType::In);
        m.insert("of",         TokenType::Of);
        m.insert("where",      TokenType::Where);
        m.insert("when",       TokenType::When);

        // --- Литералы-константы ---
        m.insert("true",       TokenType::True);
        m.insert("false",      TokenType::False);
        m.insert("nil",        TokenType::Nil);
        m.insert("none",       TokenType::None);
        m.insert("undefined",  TokenType::Undefined);
        m.insert("this",       TokenType::This);
        m.insert("super",      TokenType::Super);
        m.insert("here",       TokenType::Here);

        // --- Модификаторы доступа и ООП ---
        m.insert("public",     TokenType::Public);
        m.insert("private",    TokenType::Private);
        m.insert("protected",  TokenType::Protected);
        m.insert("internal",   TokenType::Internal);
        m.insert("external",   TokenType::External);
        m.insert("global",     TokenType::Global);
        m.insert("local",      TokenType::Local);
        m.insert("static",     TokenType::Static);
        m.insert("virtual",    TokenType::Virtual);
        m.insert("abstract",   TokenType::Abstract);
        m.insert("override",   TokenType::Override);
        m.insert("final",      TokenType::Final);

        // --- Метапрограммирование ---
        m.insert("meta",       TokenType::Meta);
        m.insert("reflect",    TokenType::Reflect);
        m.insert("attribute",  TokenType::Attribute);

        // --- Логические операторы (текстовые) ---
        m.insert("and",        TokenType::And);
        m.insert("or",         TokenType::Or);
        m.insert("not",        TokenType::Not);

        // --- Единицы измерения (как зарезервированные слова) ---
        m.insert("deg",        TokenType::UnitDegree);
        m.insert("rad",        TokenType::UnitRadian);

        // --- Константы ---
        m.insert("infinity",        TokenType::NumberInfinity);

        m
    };
}

/// Проверяет, является ли идентификатор ключевым словом.
pub fn get_keyword_token(identifier: &str) -> Option<TokenType> {
    KEYWORDS.get(identifier).cloned()
}
