use crate::lexer::token_type::TokenType;
use lazy_static::lazy_static;
use std::collections::HashMap;

lazy_static! {
    /// Полная карта ключевых слов языка Lacon.
    pub static ref KEYWORDS: HashMap<&'static str, TokenType> = {
        let mut m = HashMap::new();

        // Вспомогательная функция для регистрации синонимов одного типа
        let mut add = |aliases: &[&'static str], token_type: TokenType| {
            for &alias in aliases {
                m.insert(alias, token_type.clone());
            }
        };

        // --- Управление потоком (Control Flow) ---
        add(&["if"],                           TokenType::If);
        add(&["else"],                         TokenType::Else);
        add(&["elif"],                         TokenType::Elif);
        add(&["match"],                        TokenType::Match);
        add(&["case"],                         TokenType::Case);
        add(&["default"],                      TokenType::Default);
        add(&["switch"],                       TokenType::Switch);
        add(&["for"],                          TokenType::For);
        add(&["while"],                        TokenType::While);
        add(&["until"],                        TokenType::Until);
        add(&["spread"],                       TokenType::Spread);
        add(&["generate"],                     TokenType::Generate);
        add(&["combine"],                      TokenType::Combine);
        add(&["enumerate"],                    TokenType::Enumerate);
        add(&["filter"],                       TokenType::Filter);
        add(&["flatten"],                      TokenType::Flatten);
        add(&["repeat"],                       TokenType::Repeat);
        add(&["transform"],                    TokenType::Transform);
        add(&["transpose"],                    TokenType::Transpose);
        add(&["loop"],                         TokenType::Loop);
        add(&["break"],                        TokenType::Break);
        add(&["continue"],                     TokenType::Continue);
        add(&["return"],                       TokenType::Return);
        add(&["yield"],                        TokenType::Yield);
        add(&["exit"],                         TokenType::Exit);
        add(&["cancel"],                       TokenType::Cancel);
        add(&["defer"],                        TokenType::Defer);

        // --- Обработка исключений ---
        add(&["try"],                          TokenType::Try);
        add(&["catch"],                        TokenType::Catch);
        add(&["finally"],                      TokenType::Finally);
        add(&["throw"],                        TokenType::Throw);

        // --- Асинхронность ---
        add(&["async"],                        TokenType::Async);
        add(&["await"],                        TokenType::Await);
        add(&["coroutine"],                    TokenType::Coroutine);

        // --- Объявления и Структура ---
        add(&["class"],                        TokenType::Class);
        add(&["interface"],                    TokenType::Interface);
        add(&["enum"],                         TokenType::Enum);
        add(&["cont", "container"],                         TokenType::Container);
        add(&["func", "function"],             TokenType::Function);
        add(&["proc", "procedure"],                    TokenType::Procedure);
        add(&["let", "var", "variable"],       TokenType::Variable);
        add(&["const", "constant"],            TokenType::Constant);
        add(&["struct", "structure"],          TokenType::Structure);
        add(&["import"],                       TokenType::Import);
        add(&["export"],                       TokenType::Export);
        add(&["from"],                         TokenType::From);
        add(&["include"],                      TokenType::Include);
        add(&["new"],                          TokenType::New);

        // --- Типовая система ---
        add(&["type"],                         TokenType::Type);
        add(&["auto"],                         TokenType::Auto);
        add(&["alias"],                        TokenType::Alias);
        add(&["as"],                           TokenType::As);
        add(&["is"],                           TokenType::Is);
        add(&["extends"],                      TokenType::Extends);
        add(&["implements"],                   TokenType::Implements);
        add(&["in"],                           TokenType::In);
        add(&["of"],                           TokenType::Of);
        add(&["where"],                        TokenType::Where);
        add(&["when"],                         TokenType::When);
        add(&["contains"],                     TokenType::Contains);
        add(&["with"],                         TokenType::With);

        // --- Литералы-константы ---
        add(&["true"],                         TokenType::True);
        add(&["false"],                        TokenType::False);
        add(&["nil"],                          TokenType::Nil);
        add(&["none"],                         TokenType::None);
        add(&["undefined"],                    TokenType::Undefined);
        add(&["this"],                         TokenType::This);
        add(&["super"],                        TokenType::Super);
        add(&["root"],                        TokenType::Root);
        add(&["parent"],                        TokenType::Parent);
        add(&["here"],                         TokenType::Here);

        // --- Модификаторы доступа и ООП ---
        add(&["public"],                       TokenType::Public);
        add(&["private"],                      TokenType::Private);
        add(&["protected"],                    TokenType::Protected);
        add(&["internal"],                     TokenType::Internal);
        add(&["external"],                     TokenType::External);
        add(&["global"],                       TokenType::Global);
        add(&["local"],                        TokenType::Local);
        add(&["static"],                       TokenType::Static);
        add(&["virtual"],                      TokenType::Virtual);
        add(&["abstract"],                     TokenType::Abstract);
        add(&["override"],                     TokenType::Override);
        add(&["final"],                        TokenType::Final);

        // --- Метапрограммирование ---
        add(&["meta"],                         TokenType::Meta);
        add(&["reflect"],                      TokenType::Reflect);
        add(&["attribute"],                    TokenType::Attribute);

        // --- Логические операторы (текстовые) ---
        add(&["and"],                          TokenType::And);
        add(&["or"],                           TokenType::Or);
        add(&["not"],                          TokenType::Not);

        // --- Единицы измерения ---
        add(&["deg"],                          TokenType::UnitDegree);
        add(&["rad"],                          TokenType::UnitRadian);

        // --- Константы и Маркеры ---
        add(&["infinity", "Infinity"],                     TokenType::NumberInfinity);
        add(&["Marker"],                       TokenType::Marker);

        m
    };
}

/// Проверяет, является ли идентификатор ключевым словом.
pub fn get_keyword_token(identifier: &str) -> Option<TokenType> {
    KEYWORDS.get(identifier).cloned()
}
