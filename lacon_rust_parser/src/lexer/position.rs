use std::fmt;

/// Структура Position отслеживает точное местоположение в исходном коде.
/// Используется для генерации сообщений об ошибках и в Source Maps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Position {
    /// Номер строки (начиная с 1)
    pub line: usize,
    
    /// Номер колонки (начиная with 1)
    pub column: usize,
    
    /// Абсолютное смещение от начала файла в байтах
    pub offset: usize,
}

impl Position {
    /// Создает начальную позицию (начало файла)
    pub fn start() -> Self {
        Self {
            line: 1,
            column: 1,
            offset: 0,
        }
    }

    pub fn new(line: usize, column: usize, offset: usize) -> Self {
        Self { line, column, offset }
    }

    /// Обновляет позицию на основе прочитанного символа.
    /// Если символ — перевод строки, инкрементирует номер строки и сбрасывает колонку.
    pub fn advance(&mut self, ch: char) {
        // В Rust char может занимать от 1 до 4 байт (UTF-8)
        self.offset += ch.len_utf8();

        if ch == '\n' {
            self.line += 1;
            self.column = 1;
        } else {
            self.column += 1;
        }
    }

    /// Создает новую позицию, сдвинутую на n шагов (полезно для многосимвольных операторов)
    pub fn shifted(&self, ch: char) -> Self {
        let mut new_pos = *self;
        new_pos.advance(ch);
        new_pos
    }
}

/// Форматированный вывод: "1:15" (строка:колонка)
impl fmt::Display for Position {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.line, self.column)
    }
}

/// Реализация сложения для удобного смещения позиций
impl std::ops::Add<usize> for Position {
    type Output = Position;

    fn add(self, rhs: usize) -> Self::Output {
        Position {
            line: self.line,
            column: self.column + rhs,
            offset: self.offset + rhs,
        }
    }
}