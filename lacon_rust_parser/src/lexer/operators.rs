use crate::lexer::token_type::TokenType;

/// Структура для результата сопоставления оператора
pub struct OpMatch {
    pub token_type: TokenType,
    pub consume_count: usize, // Сколько дополнительных символов поглотить (кроме первого)
}

/// Функция сопоставляет символы с соответствующими типами токенов.
/// Принимает текущий символ и два последующих для обработки длинных операторов (например, === или ///).
pub fn match_operator(c1: char, c2: Option<char>, c3: Option<char>) -> OpMatch {
    match c1 {
        // Односимвольные
        '(' => simple(TokenType::LeftParen),
        ')' => simple(TokenType::RightParen),
        '{' => simple(TokenType::LeftBrace),
        '}' => simple(TokenType::RightBrace),
        '[' => simple(TokenType::LeftBracket),
        ']' => simple(TokenType::RightBracket),
        ',' => simple(TokenType::Comma),
        ';' => simple(TokenType::Semicolon),
        ':' => simple(TokenType::Colon),
        '?' => simple(TokenType::Question),
        '^' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::XorEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Caret),
        },
        '~' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::RegExEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Tilde),
        },
        '@' => simple(TokenType::At),
        '#' => simple(TokenType::Hash),
        '$' => simple(TokenType::Dollar),

        // Арифметика и составные операторы
        '+' => match c2 {
            Some('+') => OpMatch {
                token_type: TokenType::PlusPlus,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::PlusEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Plus),
        },
        '-' => {
            match c2 {
                // Оператор декремента --
                Some('-') => OpMatch {
                    token_type: TokenType::MinusMinus,
                    consume_count: 1,
                },
                // Оператор присваивания -=
                Some('=') => OpMatch {
                    token_type: TokenType::MinusEqual,
                    consume_count: 1,
                },
                // Тонкая стрелка ->
                Some('>') => OpMatch {
                    token_type: TokenType::Arrow,
                    consume_count: 1,
                },

                // СТРАТЕГИЧЕСКОЕ ИЗМЕНЕНИЕ:
                // Если за минусом идет буква, мы НЕ считаем это оператором здесь.
                // Возвращаем Unknown, чтобы Scanner поглотил это как часть Identifier.
                Some(c) if c.is_alphabetic() => simple(TokenType::Unknown),

                // В остальных случаях (пробел, число, конец файла) — это минус
                _ => simple(TokenType::Minus),
            }
        }
        '*' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::StarEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Star),
        },
        '/' => match c2 {
            Some('/') => {
                if let Some('/') = c3 {
                    OpMatch {
                        token_type: TokenType::DocComment,
                        consume_count: 2,
                    }
                } else {
                    OpMatch {
                        token_type: TokenType::LineComment,
                        consume_count: 1,
                    }
                }
            }
            Some('*') => OpMatch {
                token_type: TokenType::BlockComment,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::SlashEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Slash),
        },
        '%' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::PercentEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Percent), // Также может быть UnitPercent в зависимости от контекста
        },
        // Сравнение и равенство
        '=' => match c2 {
            Some('=') => {
                if let Some('=') = c3 {
                    OpMatch {
                        token_type: TokenType::EqualEqualEqual,
                        consume_count: 2,
                    }
                } else {
                    OpMatch {
                        token_type: TokenType::EqualEqual,
                        consume_count: 1,
                    }
                }
            }
            Some('>') => OpMatch {
                token_type: TokenType::FatArrow,
                consume_count: 1,
            },
            _ => simple(TokenType::Equal),
        },
        '!' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::BangEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Bang),
        },
        '>' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::GreaterEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Greater),
        },
        '<' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::LessEqual,
                consume_count: 1,
            },
            Some('|') => OpMatch {
                token_type: TokenType::PipeBackward,
                consume_count: 1,
            },
            _ => simple(TokenType::Less),
        },

        // Логика и Пайпы
        '|' => match c2 {
            Some('|') => OpMatch {
                token_type: TokenType::PipePipe,
                consume_count: 1,
            },
            Some('>') => OpMatch {
                token_type: TokenType::PipeForward,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::OrEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Pipe),
        },
        '&' => match c2 {
            Some('&') => OpMatch {
                token_type: TokenType::AmpersandAmpersand,
                consume_count: 1,
            },
            Some('=') => OpMatch {
                token_type: TokenType::AndEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Ampersand),
        },

        // Точка (MemberAccess или Append)
        '.' => match c2 {
            Some('=') => OpMatch {
                token_type: TokenType::DotEqual,
                consume_count: 1,
            },
            _ => simple(TokenType::Dot),
        },

        _ => simple(TokenType::Unknown),
    }
}

/// Вспомогательная функция для одиночных токенов
fn simple(t: TokenType) -> OpMatch {
    OpMatch {
        token_type: t,
        consume_count: 0,
    }
}
