use crate::lexer::error::{LexicalError, LexicalErrorType};
use crate::lexer::keywords::get_keyword_token;
use crate::lexer::operators::match_operator;
use crate::lexer::position::Position;
use crate::lexer::token::Token;
use crate::lexer::token_type::TokenType;

pub struct Scanner {
    source: Vec<char>,
    tokens: Vec<Token>,
    start: usize,
    current: usize,
    position: Position,       // Текущая позиция
    start_position: Position, // Позиция начала текущего токена
    indent_stack: Vec<usize>,
    context_stack: Vec<TokenType>,
    is_at_line_start: bool,
    pub errors: Vec<LexicalError>,
}

impl Scanner {
    pub fn new(source: String) -> Self {
        let start_pos = Position::start();
        Self {
            source: source.chars().collect(),
            tokens: Vec::new(),
            start: 0,
            current: 0,
            position: start_pos,
            start_position: start_pos,
            indent_stack: vec![0],
            context_stack: Vec::new(),
            is_at_line_start: true,
            errors: Vec::new(),
        }
    }

    pub fn scan_tokens(&mut self) -> &Vec<Token> {
        self.add_token_raw(TokenType::BOF);

        while !self.is_at_end() {
            self.start = self.current;
            self.start_position = self.position;

            if self.is_at_line_start {
                self.handle_indentation();
            }
            if !self.is_at_end() {
                self.scan_token();
            }
        }

        while self.indent_stack.len() > 1 {
            self.indent_stack.pop();
            self.add_token_raw(TokenType::Dedent);
        }

        self.tokens.push(Token::eof(self.position));
        &self.tokens
    }

    fn scan_token(&mut self) {
        let c = self.advance();

        match c {
            ' ' | '\t' => {
                if self.is_assign_whitespace() {
                    self.add_token_raw(TokenType::Whitespace);
                }
                self.start = self.current;
                self.start_position = self.position;
            }
            '\r' => {
                self.start = self.current;
                self.start_position = self.position;
            }
            '\n' => {
                self.add_token_raw(TokenType::Newline);
                self.is_at_line_start = true;
                self.start = self.current;
                self.start_position = self.position;
            }

            '"' => self.scan_string(),

            '(' | '[' | '{' => {
                let t_type = match c {
                    '(' => TokenType::LeftParen,
                    '[' => TokenType::LeftBracket,
                    _ => TokenType::LeftBrace,
                };
                self.context_stack.push(t_type);
                self.handle_operator(c);
            }
            ')' | ']' | '}' => {
                if !self.context_stack.is_empty() {
                    self.context_stack.pop();
                }
                self.handle_operator(c);
            }

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

    fn scan_identifier(&mut self) {
        while let Some(c) = self.peek() {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                self.advance();
            } else {
                break;
            }
        }
        let text = self.get_lexeme();
        let t_type = get_keyword_token(&text).unwrap_or(TokenType::Identifier);
        self.add_token(t_type);
    }

    fn scan_number(&mut self) {
        while self.peek().map_or(false, |c| c.is_digit(10)) {
            self.advance();
        }

        if self.peek() == Some('.') && self.peek_next().map_or(false, |c| c.is_digit(10)) {
            self.advance();
            while self.peek().map_or(false, |c| c.is_digit(10)) {
                self.advance();
            }
        }

        let value = self.get_lexeme();

        if let Some(c) = self.peek() {
            if c == '%' {
                self.advance();
                self.add_token_with_literal(TokenType::UnitPercent, value);
                return;
            } else if c.is_alphabetic() {
                let unit_start = self.current;
                while self.peek().map_or(false, |nc| nc.is_alphabetic()) {
                    self.advance();
                }
                let unit = self.get_slice(unit_start, self.current);

                if let Some(unit_type) = get_keyword_token(&unit) {
                    self.add_token_with_literal(unit_type, value);
                    return;
                }
                self.current = unit_start;
            }
        }
        self.add_token_with_literal(TokenType::Number, value);
    }

    fn scan_string(&mut self) {
        let is_multiline = self.match_char('"') && self.match_char('"');
        let quote_len = if is_multiline { 3 } else { 1 };

        while !self.is_at_end() {
            // Проверка завершения многострочной строки (""")
            if is_multiline {
                if self.peek() == Some('"')
                    && self.peek_next() == Some('"')
                    && self.source.get(self.current + 2) == Some(&'"')
                {
                    break;
                }
            } else {
                // Проверка завершения обычной строки (") или прерывания новой строкой
                if self.peek() == Some('"') || self.peek() == Some('\n') {
                    break;
                }
            }

            let c = self.advance();

            // --- ЛОГИКА ЭКРАНИРОВАНИЯ ---
            // Если встречаем \, мы "проглатываем" следующий символ,
            // чтобы он не воспринимался как управляющий (например, закрывающая кавычка)
            if c == '\\' && !self.is_at_end() {
                self.advance();
            }
        }

        // Проверка на незакрытую строку
        if self.is_at_end() || (!is_multiline && self.peek() == Some('\n')) {
            self.report_error(
                LexicalErrorType::UnterminatedString,
                "Unclosed string literal",
            );
            return;
        }

        // Поглощаем закрывающие кавычки
        for _ in 0..quote_len {
            self.advance();
        }

        // Извлекаем содержимое.
        // Мы берем срез от (начало + длина кавычек) до (текущий - длина кавычек)
        let literal_value = self.get_slice(self.start + quote_len, self.current - quote_len);

        let t_type = if is_multiline {
            TokenType::MultilineString
        } else {
            TokenType::String
        };

        self.add_token_with_literal(t_type, literal_value);
    }

    fn is_assign_whitespace(&self) -> bool {
        let last_token = self.tokens.last().map(|t| &t.token_type);

        if !matches!(
            last_token,
            Some(TokenType::Identifier)
                | Some(TokenType::RightParen)
                | Some(TokenType::RightBracket)
                | Some(TokenType::String)
                | Some(TokenType::Number)
                | Some(TokenType::UnitPercent)
        ) {
            return false;
        }

        let mut look = self.current;
        while look < self.source.len() && (self.source[look] == ' ' || self.source[look] == '\t') {
            look += 1;
        }

        if look >= self.source.len() {
            return false;
        }
        let next_c = self.source[look];

        next_c.is_alphanumeric()
            || matches!(next_c, '-' | '"' | '{' | '[' | '(' | '_' | '#' | '$' | '\\')
    }

    fn handle_indentation(&mut self) {
        let mut spaces = 0;
        while let Some(c) = self.peek() {
            match c {
                ' ' => {
                    spaces += 1;
                    self.advance();
                }
                '\t' => {
                    spaces += 4;
                    self.advance();
                }
                _ => break,
            }
        }

        if matches!(self.peek(), Some('\n') | Some('\r')) {
            return;
        }

        // Игнорируем отступы для нового типа комментария /|\ или старого /*
        if self.peek() == Some('/') {
            let c2 = self.peek_next();
            if c2 == Some('|') || c2 == Some('*') {
                return;
            }
        }

        if !self.context_stack.is_empty() {
            self.is_at_line_start = false;
            self.start = self.current;
            self.start_position = self.position;
            return;
        }

        let last_indent = *self.indent_stack.last().unwrap();
        if spaces > last_indent {
            self.indent_stack.push(spaces);
            self.add_token_raw(TokenType::Indent);
        } else if spaces < last_indent {
            while spaces < *self.indent_stack.last().unwrap() {
                self.indent_stack.pop();
                self.add_token_raw(TokenType::Dedent);
            }

            if spaces != *self.indent_stack.last().unwrap() {
                self.report_error(
                    LexicalErrorType::InvalidIndent,
                    &format!(
                        "Indentation error: expected match for previous levels, found {} spaces",
                        spaces
                    ),
                );
            }
        }

        self.is_at_line_start = false;
        self.start = self.current;
        self.start_position = self.position;
    }

    fn handle_operator(&mut self, c: char) {
        let op = match_operator(c, self.peek(), self.peek_next());

        match op.token_type {
            TokenType::Unknown => {
                if c == '-' {
                    if self.peek().map_or(false, |next| next.is_digit(10)) {
                        self.scan_number();
                    } else {
                        self.scan_identifier();
                    }
                } else if c == '_' {
                    self.scan_identifier();
                } else {
                    self.report_error(LexicalErrorType::InvalidCharacter(c), "Unknown character");
                }
            }
            TokenType::LineComment => {
                // Поглощаем символы индикатора комментария (уже учтен consume_count)
                for _ in 0..op.consume_count {
                    self.advance();
                }
                self.skip_line_comment();
            }
            TokenType::BlockComment => {
                for _ in 0..op.consume_count {
                    self.advance();
                }
                self.skip_block_comment();
            }
            _ => {
                for _ in 0..op.consume_count {
                    self.advance();
                }
                self.add_token(op.token_type);
            }
        }
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
    fn is_at_end(&self) -> bool {
        self.current >= self.source.len()
    }

    fn match_char(&mut self, expected: char) -> bool {
        if self.peek() == Some(expected) {
            self.advance();
            true
        } else {
            false
        }
    }

    fn get_lexeme(&self) -> String {
        self.source[self.start..self.current].iter().collect()
    }

    fn get_slice(&self, start: usize, end: usize) -> String {
        self.source[start..end].iter().collect()
    }

    fn add_token_raw(&mut self, t_type: TokenType) {
        self.tokens
            .push(Token::new(t_type, "".into(), None, self.start_position, 0));
    }

    fn add_token(&mut self, t_type: TokenType) {
        let text = self.get_lexeme();
        let len = text.len();
        self.tokens
            .push(Token::new(t_type, text, None, self.start_position, len));
    }

    fn add_token_with_literal(&mut self, t_type: TokenType, literal: String) {
        let text = self.get_lexeme();
        let len = text.len();
        self.tokens.push(Token::new(
            t_type,
            text,
            Some(literal),
            self.start_position,
            len,
        ));
    }

    fn report_error(&mut self, error_type: LexicalErrorType, message: &str) {
        self.errors.push(LexicalError {
            message: message.to_string(),
            position: self.start_position,
            error_type,
        });
        self.add_token(TokenType::Error);
    }

    fn skip_line_comment(&mut self) {
        while self.peek() != Some('\n') && !self.is_at_end() {
            self.advance();
        }
        self.start = self.current;
        self.start_position = self.position;
    }

    fn skip_block_comment(&mut self) {
        while !self.is_at_end() {
            if self.peek() == Some('*') && self.peek_next() == Some('/') {
                self.advance();
                self.advance();
                break;
            }
            self.advance();
        }
        self.start = self.current;
        self.start_position = self.position;
    }
}
