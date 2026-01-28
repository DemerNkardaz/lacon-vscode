use crate::lexer::error::{LexicalError, LexicalErrorType};
use crate::lexer::keywords::get_keyword_token;
use crate::lexer::operators::match_operator;
use crate::lexer::position::Position;
use crate::lexer::token::Token;
use crate::lexer::token_type::TokenType;
use crate::shared::unit::units::{UNITS, UNITS_TREE};
use crate::utils::unit::get_unit_type;

pub struct Scanner {
    source: Vec<char>,
    tokens: Vec<Token>,
    start: usize,
    current: usize,
    position: Position,
    start_position: Position,
    indent_stack: Vec<usize>,
    context_stack: Vec<TokenType>,
    string_stack: Vec<(char, bool)>,
    is_at_line_start: bool,
    had_whitespace: bool,
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
            string_stack: Vec::new(),
            is_at_line_start: true,
            had_whitespace: false, // На старте пробела нет
            errors: Vec::new(),
        }
    }

    pub fn scan_tokens(&mut self) -> &Vec<Token> {
        self.add_token_raw(TokenType::SOF);

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
            // Теперь пробелы просто устанавливают флаг и не создают токенов
            ' ' | '\t' | '\r' => {
                self.had_whitespace = true;
                self.start = self.current;
                self.start_position = self.position;
            }
            '\n' => {
                self.add_token_raw(TokenType::Newline);
                self.is_at_line_start = true;
                self.had_whitespace = false; // После новой строки пробел сбрасываем (его учтет Indent)
                self.start = self.current;
                self.start_position = self.position;
            }

            '"' | '\'' | '`' => {
                self.scan_string(c);
            }

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

                if c == '}' {
                    if let Some((quote, is_multiline)) = self.string_stack.pop() {
                        self.start = self.current;
                        self.start_position = self.position;
                        self.continue_string_scan(quote, is_multiline);
                    }
                }
            }

            '-' => {
                let next = self.peek();
                let next_next = self.peek_next();
                let is_inf = (next == Some('I') || next == Some('i')) && self.check_infinity(1);

                if next == Some('>') {
                    self.handle_operator(c);
                } else if (!is_inf && next.map_or(false, |n| n.is_alphabetic() || n == '_'))
                    || (next == Some('$') && next_next == Some('{'))
                {
                    self.scan_identifier();
                } else {
                    self.handle_operator(c);
                }
            }

            _ => {
                if c.is_digit(10) {
                    self.scan_number();
                } else if (c == 'I' || c == 'i') && self.check_infinity(0) {
                    self.scan_infinity_as_number();
                } else if c.is_alphabetic() || c == '_' {
                    self.scan_identifier();
                } else {
                    self.handle_operator(c);
                }
            }
        }
    }

    // --- Методы добавления токенов с поддержкой флагов ---

    fn add_token_raw(&mut self, t_type: TokenType) {
        // Системные токены не сбрасывают флаг начала строки и не используют had_whitespace
        let is_start = if matches!(
            t_type,
            TokenType::Indent | TokenType::Dedent | TokenType::SOF | TokenType::Newline
        ) {
            false
        } else {
            let res = self.is_at_line_start;
            if res {
                self.is_at_line_start = false;
            }
            res
        };

        // Для системных токенов обычно не важен предшествующий пробел
        let has_ws = if matches!(
            t_type,
            TokenType::Indent | TokenType::Dedent | TokenType::Newline
        ) {
            false
        } else {
            let res = self.had_whitespace;
            self.had_whitespace = false;
            res
        };

        self.tokens.push(Token::new(
            t_type,
            is_start,
            has_ws,
            "".into(),
            None,
            self.start_position,
            0,
        ));
    }

    fn add_token(&mut self, t_type: TokenType) {
        let text = self.get_lexeme();
        let len = text.len();

        let is_start = self.is_at_line_start;
        if is_start {
            self.is_at_line_start = false;
        }

        let has_ws = self.had_whitespace;
        self.had_whitespace = false;

        self.tokens.push(Token::new(
            t_type,
            is_start,
            has_ws,
            text,
            None,
            self.start_position,
            len,
        ));
    }

    fn add_token_with_literal(&mut self, t_type: TokenType, literal: String) {
        let text = self.get_lexeme();
        let len = text.len();

        let is_start = self.is_at_line_start;
        if is_start {
            self.is_at_line_start = false;
        }

        let has_ws = self.had_whitespace;
        self.had_whitespace = false;

        self.tokens.push(Token::new(
            t_type,
            is_start,
            has_ws,
            text,
            Some(literal),
            self.start_position,
            len,
        ));
    }

    fn scan_identifier(&mut self) {
        while let Some(c) = self.peek() {
            if c == '$' && self.peek_next() == Some('{') {
                break;
            }
            if c == '-' {
                let next = self.peek_next();
                let next_next = self.peek_at(2);
                let is_normal_id_part =
                    next.map_or(false, |n| n.is_alphanumeric()) && next != Some('>');
                let is_link_to_interpolation = next == Some('$') && next_next == Some('{');
                if is_normal_id_part || is_link_to_interpolation {
                    self.advance();
                    continue;
                } else {
                    break;
                }
            }
            if c.is_alphanumeric() || c == '_' {
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
        let mut radix: u32 = 10;
        if self.source[self.start] == '0' {
            if let Some(second) = self.peek() {
                match second.to_ascii_lowercase() {
                    'x' => {
                        radix = 16;
                        self.advance();
                    }
                    'b' => {
                        radix = 2;
                        self.advance();
                    }
                    'o' => {
                        radix = 8;
                        self.advance();
                    }
                    't' => {
                        radix = 32;
                        self.advance();
                    }
                    'c' => {
                        radix = 33;
                        self.advance();
                    }
                    _ => {}
                }
            }
        }
        self.consume_digits_with_underscore(radix);
        if radix == 10 && self.peek() == Some('.') {
            if let Some(next) = self.peek_next() {
                if next.is_digit(10) {
                    self.advance();
                    self.consume_digits_with_underscore(10);
                }
            }
        }
        let value_literal = self.get_slice(self.start, self.current);
        self.process_unit_suffix(value_literal);
    }

    fn process_unit_suffix(&mut self, value_literal: String) {
        // 1. Берем срез чаров от текущей позиции до конца
        let lookahead = &self.source[self.current..];
        let unit_char_count = UNITS_TREE.longest_match(lookahead);

        if unit_char_count > 0 {
            // 3. Проверка границы слова (Word Boundary)
            // Чтобы "10m" внутри "10meters" не распозналось как юнит 'm'
            let is_valid_boundary = if let Some(&nc) = lookahead.get(unit_char_count) {
                !(nc.is_alphanumeric() && nc != '/')
            } else {
                true
            };

            if is_valid_boundary {
                for _ in 0..unit_char_count {
                    self.advance();
                }

                self.add_token_with_literal(TokenType::Unit, value_literal);
                return;
            }
        }

        // 5. Если совпадений нет или граница не валидна — это обычное число
        self.add_token_with_literal(TokenType::Number, value_literal);
    }

    fn scan_infinity_as_number(&mut self) {
        for _ in 0..7 {
            self.advance();
        }
        let value_literal = "Infinity".to_string();
        self.process_unit_suffix(value_literal);
    }

    fn consume_digits_with_underscore(&mut self, radix: u32) {
        while let Some(c) = self.peek() {
            if c == '_' {
                self.advance();
                continue;
            }
            let is_valid = match radix {
                2 => c == '0' || c == '1',
                8 => c >= '0' && c <= '7',
                10 => c.is_digit(10),
                16 => c.is_digit(16),
                32 => {
                    c.is_digit(10)
                        || (c.to_ascii_lowercase() >= 'a' && c.to_ascii_lowercase() <= 'v')
                }
                33 => {
                    let lower = c.to_ascii_lowercase();
                    c.is_digit(10) || (lower >= 'a' && lower <= 'z' && !"ilou".contains(lower))
                }
                _ => false,
            };
            if is_valid {
                self.advance();
            } else {
                break;
            }
        }
    }

    fn scan_string(&mut self, quote: char) {
        let is_multiline = quote == '"' && self.match_char('"') && self.match_char('"');
        self.continue_string_scan(quote, is_multiline);
    }

    fn continue_string_scan(&mut self, quote: char, is_multiline: bool) {
        let quote_len = if is_multiline { 3 } else { 1 };
        let content_start = self.current;

        while !self.is_at_end() {
            if self.peek() == Some('\\') && self.peek_next() == Some('$') {
                self.advance();
                self.advance();
                continue;
            }
            if self.peek() == Some('$') && self.peek_next() == Some('{') {
                let literal = self.get_slice(content_start, self.current);
                let t_type = self.get_string_token_type(quote, is_multiline);
                self.add_token_with_literal(t_type, literal);
                self.string_stack.push((quote, is_multiline));
                self.start = self.current;
                self.start_position = self.position;
                self.advance();
                self.advance();
                self.add_token(TokenType::DollarLeftBrace);
                return;
            }
            if is_multiline {
                if self.peek() == Some('"')
                    && self.peek_next() == Some('"')
                    && self.peek_at(2) == Some('"')
                {
                    break;
                }
            } else if self.peek() == Some(quote) || self.peek() == Some('\n') {
                break;
            }
            let c = self.advance();
            if c == '\\' && !self.is_at_end() {
                self.advance();
            }
        }

        if self.is_at_end() || (!is_multiline && self.peek() == Some('\n')) {
            self.report_error(LexicalErrorType::UnterminatedString, "Unclosed string");
            return;
        }

        let literal = self.get_slice(content_start, self.current);
        for _ in 0..quote_len {
            self.advance();
        }
        let t_type = self.get_string_token_type(quote, is_multiline);
        self.add_token_with_literal(t_type, literal);
    }

    fn get_string_token_type(&self, quote: char, is_multiline: bool) -> TokenType {
        match quote {
            '"' if is_multiline => TokenType::MultilineString,
            '"' => TokenType::String,
            '\'' => TokenType::SingleQuotedString,
            '`' => TokenType::GraveQuotedString,
            _ => TokenType::String,
        }
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
        if self.peek() == Some('/')
            && (self.peek_next() == Some('|') || self.peek_next() == Some('*'))
        {
            return;
        }

        if !self.context_stack.is_empty() {
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
        }
        self.start = self.current;
        self.start_position = self.position;
    }

    fn handle_operator(&mut self, c: char) {
        let op = match_operator(c, self.peek(), self.peek_next());
        match op.token_type {
            TokenType::LineComment => {
                for _ in 0..op.consume_count {
                    self.advance();
                }
                while self.peek() != Some('\n') && !self.is_at_end() {
                    self.advance();
                }
            }
            TokenType::BlockComment => {
                for _ in 0..op.consume_count {
                    self.advance();
                }
                while !self.is_at_end() {
                    if self.peek() == Some('*') && self.peek_next() == Some('/') {
                        self.advance();
                        self.advance();
                        break;
                    }
                    self.advance();
                }
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
    fn peek_at(&self, distance: usize) -> Option<char> {
        self.source.get(self.current + distance).copied()
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

    fn check_infinity(&self, offset: usize) -> bool {
        let expected = "nfinity";
        for (i, ch) in expected.chars().enumerate() {
            if self.peek_at(i + offset).map(|c| c.to_ascii_lowercase()) != Some(ch) {
                return false;
            }
        }
        true
    }

    fn report_error(&mut self, error_type: LexicalErrorType, message: &str) {
        self.errors.push(LexicalError {
            message: message.to_string(),
            position: self.start_position,
            error_type,
        });
        self.add_token(TokenType::Error);
    }
}
