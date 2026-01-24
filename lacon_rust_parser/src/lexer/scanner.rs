use crate::lexer::keywords::get_keyword_token;
use crate::lexer::operators::{OpMatch, match_operator};
use crate::lexer::position::Position;
use crate::lexer::token::Token;
use crate::lexer::token_type::TokenType;

pub struct Scanner {
    source: Vec<char>,
    tokens: Vec<Token>,
    start: usize,
    current: usize,
    position: Position,
    indent_stack: Vec<usize>,
    is_at_line_start: bool,
}

impl Scanner {
    pub fn new(source: String) -> Self {
        Self {
            source: source.chars().collect(),
            tokens: Vec::new(),
            start: 0,
            current: 0,
            position: Position::start(),
            indent_stack: vec![0],
            is_at_line_start: true,
        }
    }

    /// Основной цикл сканирования
    pub fn scan_tokens(&mut self) -> &Vec<Token> {
        while !self.is_at_end() {
            self.start = self.current;
            if self.is_at_line_start {
                self.handle_indentation();
            }
            if !self.is_at_end() {
                self.scan_token();
            }
        }

        self.tokens.push(Token::eof(self.position));
        &self.tokens
    }

    fn scan_token(&mut self) {
        let c = self.advance();

        match c {
            // Управление пробелами и строками
            ' ' | '\t' | '\r' => {
                // В Lacon мы можем сохранять пробелы, если это нужно для "barewords"
                // Но пока просто пропускаем их внутри строк
            }
            '\n' => {
                self.add_token(TokenType::Newline);
                self.is_at_line_start = true;
            }

            // Структурные символы
            '(' => self.add_token(TokenType::LeftParen),
            ')' => self.add_token(TokenType::RightParen),
            '{' => self.add_token(TokenType::LeftBrace),
            '}' => self.add_token(TokenType::RightBrace),
            '[' => self.add_token(TokenType::LeftBracket),
            ']' => self.add_token(TokenType::RightBracket),
            ',' => self.add_token(TokenType::Comma),
            ';' => self.add_token(TokenType::Semicolon),

            // Литералы
            '"' => self.scan_string(),

            _ => {
                self.is_at_line_start = false;
                if c.is_digit(10) {
                    self.scan_number();
                } else if c.is_alphabetic() || c == '_' {
                    self.scan_identifier();
                } else {
                    self.handle_operator(c);
                }
            }
        }
    }

    /// Обработка отступов (Python-style / Layout-sensitive)
    fn handle_indentation(&mut self) {
        let mut spaces = 0;
        while let Some(c) = self.peek() {
            if c == ' ' {
                spaces += 1;
                self.advance();
            } else if c == '\t' {
                spaces += 4;
                self.advance();
            } else {
                break;
            }
        }

        // Пропускаем пустые строки или строки с комментариями при расчете отступа
        if let Some('\n') = self.peek() {
            return;
        }
        if let (Some('/'), Some('/')) = (self.peek(), self.peek_next()) {
            return;
        }

        let last_indent = *self.indent_stack.last().unwrap();
        if spaces > last_indent {
            self.indent_stack.push(spaces);
            self.add_token(TokenType::Indent);
        } else if spaces < last_indent {
            while spaces < *self.indent_stack.last().unwrap() {
                self.indent_stack.pop();
                self.add_token(TokenType::Dedent);
            }
        }
        self.is_at_line_start = false;
    }

    /// Обработка операторов через match_operator
    fn handle_operator(&mut self, c: char) {
        let next = self.peek();
        let next_next = self.peek_next();

        let op_match = match_operator(c, next, next_next);

        if op_match.token_type == TokenType::Unknown {
            // Подстраховка для дефиса в именах (например, background-color)
            if c == '-' || c == '_' {
                self.scan_identifier();
            } else {
                self.add_token(TokenType::Error);
            }
        } else {
            for _ in 0..op_match.consume_count {
                self.advance();
            }
            self.add_token(op_match.token_type);
        }
    }

    /// Сканирование идентификаторов и ключевых слов (поддерживает дефис внутри)
    fn scan_identifier(&mut self) {
        while let Some(c) = self.peek() {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                self.advance();
            } else {
                break;
            }
        }

        let text: String = self.source[self.start..self.current].iter().collect();
        let t_type = get_keyword_token(&text).unwrap_or(TokenType::Identifier);
        self.add_token(t_type);
    }

    /// Сканирование чисел и единиц измерения (180deg, 10%)
    fn scan_number(&mut self) {
        while let Some(c) = self.peek() {
            if c.is_digit(10) {
                self.advance();
            } else {
                break;
            }
        }

        // Дробная часть
        if self.peek() == Some('.') && self.peek_next().map_or(false, |c| c.is_digit(10)) {
            self.advance(); // .
            while let Some(c) = self.peek() {
                if c.is_digit(10) {
                    self.advance();
                } else {
                    break;
                }
            }
        }

        let number_value: String = self.source[self.start..self.current].iter().collect();

        // Проверка на единицы измерения (Unit) сразу после числа
        if let Some(c) = self.peek() {
            if c.is_alphabetic() || c == '%' {
                let unit_start = self.current;

                if c == '%' {
                    self.advance();
                    self.add_token_with_literal(TokenType::UnitPercent, number_value);
                    return;
                }

                while let Some(next_c) = self.peek() {
                    if next_c.is_alphabetic() {
                        self.advance();
                    } else {
                        break;
                    }
                }

                let unit: String = self.source[unit_start..self.current].iter().collect();
                if let Some(unit_type) = get_keyword_token(&unit) {
                    self.add_token_with_literal(unit_type, number_value);
                    return;
                }
            }
        }

        self.add_token_with_literal(TokenType::Number, number_value);
    }

    /// Сканирование строк (обычных и многострочных)
    fn scan_string(&mut self) {
        if self.peek() == Some('"') && self.peek_next() == Some('"') {
            self.advance(); // второй "
            self.advance(); // третий "
            self.scan_multiline_string();
            return;
        }

        while let Some(c) = self.peek() {
            if c == '"' {
                break;
            }
            self.advance();
        }

        if self.is_at_end() {
            self.add_token(TokenType::Error);
            return;
        }

        self.advance(); // закрывающая "
        let value: String = self.source[self.start + 1..self.current - 1]
            .iter()
            .collect();
        self.add_token_with_literal(TokenType::String, value);
    }

    fn scan_multiline_string(&mut self) {
        while !self.is_at_end() {
            if self.peek() == Some('"')
                && self.peek_next() == Some('"')
                && self.source.get(self.current + 2) == Some(&'"')
            {
                break;
            }
            self.advance();
        }

        if self.is_at_end() {
            self.add_token(TokenType::Error);
            return;
        }

        self.advance();
        self.advance();
        self.advance();
        let value: String = self.source[self.start + 3..self.current - 3]
            .iter()
            .collect();
        self.add_token_with_literal(TokenType::MultilineString, value);
    }

    // --- Инструментарий ---

    fn is_at_end(&self) -> bool {
        self.current >= self.source.len()
    }

    fn advance(&mut self) -> char {
        let c = self.source[self.current];
        self.current += 1;
        self.position.advance(c);
        c
    }

    fn peek(&self) -> Option<char> {
        self.source.get(self.current).copied()
    }

    fn peek_next(&self) -> Option<char> {
        self.source.get(self.current + 1).copied()
    }

    fn add_token(&mut self, t_type: TokenType) {
        let text: String = self.source[self.start..self.current].iter().collect();
        self.tokens.push(Token::new(
            t_type,
            text,
            None,
            self.position,
            self.current - self.start,
        ));
    }

    fn add_token_with_literal(&mut self, t_type: TokenType, literal: String) {
        let text: String = self.source[self.start..self.current].iter().collect();
        self.tokens.push(Token::new(
            t_type,
            text,
            Some(literal),
            self.position,
            self.current - self.start,
        ));
    }
}
