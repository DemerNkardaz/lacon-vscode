#[derive(Debug, Clone, PartialEq)]
pub enum TokenType {
    // ─────────────────────────────────────────────
    // Структурные символы / разделители
    // ─────────────────────────────────────────────
    LeftParen,       // (  \\ GroupStart
    RightParen,      // )  \\ GroupEnd
    LeftBrace,       // {  \\ BlockStart
    RightBrace,      // }  \\ BlockEnd
    LeftBracket,     // [  \\ IndexStart
    RightBracket,    // ]  \\ IndexEnd
    Comma,           // ,  \\ Separator
    Dot,             // .  \\ MemberAccess
    DotDotDot,       // ... \\ Destructuring
    Semicolon,       // ;  \\ StatementEnd
    Colon,           // :  \\ TypeOrLabel
    ColonColon,      // :: \\ TypeOrLabel
    Backslash,       // \  \\
    DoubleBackslash, // \\ \\
    Question,        // ?  \\ Conditional / Nullable

    // ─────────────────────────────────────────────
    // Арифметические операторы
    // ─────────────────────────────────────────────
    Plus,        // +  \\ Add
    Minus,       // -  \\ Subtract / Negate
    Star,        // *  \\ Multiply
    Slash,       // /  \\ Divide
    DoubleSlash, // // \\ IntegerDivide
    Percent,     // %  \\ Modulo

    // ─────────────────────────────────────────────
    // Инкременты и присваивания
    // ─────────────────────────────────────────────
    PlusPlus,     // ++ \\ Increment
    MinusMinus,   // -- \\ Decrement
    Equal,        // =  \\ Assign
    Whitespace,   //   \\ Can be Assign
    PlusEqual,    // += \\ AddAssign
    MinusEqual,   // -= \\ SubAssign
    StarEqual,    // *= \\ MulAssign
    SlashEqual,   // /= \\ DivAssign
    PercentEqual, // %= \\ ModAssign
    DotEqual,     // .= \\ Append / ConcatAssign
    DotDot,       // ..  \\ Range

    // ─────────────────────────────────────────────
    // Сравнение и равенство
    // ─────────────────────────────────────────────
    Bang,            // !   \\ LogicalNot
    BangEqual,       // !=  \\ NotEqual
    EqualEqual,      // ==  \\ Equal
    EqualEqualEqual, // === \\ StrictEqual
    Greater,         // >   \\ GreaterThan
    GreaterEqual,    // >=  \\ GreaterOrEqual
    Less,            // <   \\ LessThan
    LessEqual,       // <=  \\ LessOrEqual
    RegExEqual,      // ~=  \\ PatternMatch

    // ─────────────────────────────────────────────
    // Логические операторы
    // ─────────────────────────────────────────────
    And,                // and \\ LogicalAnd (keyword)
    Or,                 // or  \\ LogicalOr (keyword)
    Not,                // not \\ LogicalNot (keyword)
    AmpersandAmpersand, // && \\ LogicalAnd
    PipePipe,           // ||  \\ LogicalOr
    QuestionQuestion,   // ?? \\ NullishCoalescing

    // ─────────────────────────────────────────────
    // Битовые операторы
    // ─────────────────────────────────────────────
    Ampersand, // &  \\ BitwiseAnd
    Pipe,      // |  \\ BitwiseOr
    Caret,     // ^  \\ BitwiseXor
    Tilde,     // ~  \\ BitwiseNot

    AndEqual, // &= \\ BitwiseAndAssign
    OrEqual,  // |= \\ BitwiseOrAssign
    XorEqual, // ^= \\ BitwiseXorAssign

    // ─────────────────────────────────────────────
    // Pipe / функциональный поток
    // ─────────────────────────────────────────────
    Arrow,        // -> \\ ThinArrow / Mapping
    FatArrow,     // => \\ Lambda / CaseArrow
    PipeForward,  // |> \\ PipeForward / ForwardApply
    PipeBackward, // <| \\ PipeBackward / BackwardApply

    // ─────────────────────────────────────────────
    // Литералы и идентификаторы
    // ─────────────────────────────────────────────
    Identifier,      // name \\ Identifier
    Number,          // 123  \\ NumericLiteral
    String,          // " "  \\ StringLiteral
    MultilineString, // """ \\ MultilineStringLiteral
    Placeholder,     // _    \\ Placeholder / PartialApply

    // ─────────────────────────────────────────────
    // Комментарии
    // ─────────────────────────────────────────────
    LineComment,  // //   \\ LineComment
    BlockComment, // /* */\\ BlockComment
    DocComment,   // ///  \\ DocumentationComment

    // ─────────────────────────────────────────────
    // Управление потоком
    // ─────────────────────────────────────────────
    If,      // if   \\ Conditional
    Else,    // else \\ AlternativeBranch
    Elif,    // elif \\ ElseIf
    Match,   // match\\ PatternMatch
    Case,    // case \\ MatchArm
    Default, // default \\ FallbackCase
    Switch,  // switch \\ SwitchStatement

    For,   // for  \\ LoopFor
    While, // while\\ LoopWhile
    Loop,  // loop \\ InfiniteLoop

    Break,    // break \\ LoopBreak
    Continue, // continue \\ LoopContinue
    Return,   // return \\ FunctionReturn
    Yield,    // yield \\ GeneratorYield
    Exit,     // exit \\ ProgramExit
    Cancel,   // cancel \\ AbortExecution

    Try,     // try  \\ ExceptionBlock
    Catch,   // catch\\ ExceptionHandler
    Finally, // finally \\ CleanupBlock
    Throw,   // throw \\ RaiseException

    Await,     // await \\ AsyncAwait
    Async,     // async \\ AsyncContext
    Coroutine, // coroutine \\ CoroutineDecl
    Defer,     // defer \\ DeferredExecution

    // ─────────────────────────────────────────────
    // Объявления и структура программы
    // ─────────────────────────────────────────────
    Class,     // class \\ ClassDecl
    Interface, // interface \\ InterfaceDecl
    Enum,      // enum \\ EnumDecl
    Container, // container \\ Namespace / Module

    Function,  // function \\ FunctionDecl
    Procedure, // procedure \\ ProcedureDecl

    Variable, // var  \\ VariableDecl
    Constant, // const\\ ConstantDecl

    Import,  // import \\ ImportModule
    Export,  // export \\ ExportSymbol
    From,    // from \\ ImportSource
    Include, // include \\ IncludeFile

    // ─────────────────────────────────────────────
    // Типовая система
    // ─────────────────────────────────────────────
    Type,    // type \\ TypeDecl
    Auto,    // auto \\ TypeInference
    Alias,   // alias\\ TypeAlias
    Generic, // <T>  \\ GenericParam

    Undefined, // undefined \\ UndefinedValue
    None,      // none \\ NoneValue
    Nil,       // nil  \\ NilValue
    True,      // true \\ BooleanTrue
    False,     // false\\ BooleanFalse

    As,         // as   \\ TypeCast
    Is,         // is   \\ TypeCheck
    Extends,    // extends \\ Inheritance
    Implements, // implements \\ InterfaceImpl
    In,         // in   \\ Membership
    Of,         // of   \\ Association
    Where,      // where \\ TypeConstraint
    When,       // when \\ ConditionalGuard

    // ─────────────────────────────────────────────
    // Контекст объекта
    // ─────────────────────────────────────────────
    This,  // this \\ CurrentInstance
    Super, // super\\ BaseInstance

    // ─────────────────────────────────────────────
    // Модификаторы доступа и ОО
    // ─────────────────────────────────────────────
    Public,    // public \\ PublicAccess
    Private,   // private \\ PrivateAccess
    Protected, // protected \\ ProtectedAccess
    Internal,  // internal \\ ModuleAccess
    External,  // external \\ ExternalLinkage
    Global,    // global \\ GlobalAccess
    Local,     // local \\ LocalAccess

    Static,   // static \\ StaticMember
    Virtual,  // virtual \\ Overridable
    Abstract, // abstract \\ AbstractMember
    Override, // override \\ OverrideBase
    Final,    // final \\ NonOverridable

    // ─────────────────────────────────────────────
    // Метапрограммирование / атрибуты
    // ─────────────────────────────────────────────
    Meta,      // meta \\ MetaContext
    Reflect,   // reflect \\ Reflection
    Attribute, // attribute \\ Annotation

    At,     // @ \\ AttributePrefix
    Hash,   // # \\ Directive / Macro
    Dollar, // $ \\ SpecialIdentifier

    // ─────────────────────────────────────────────
    // Layout / whitespace-sensitive синтаксис
    // ─────────────────────────────────────────────
    Newline, // \n \\ LineBreak
    Indent,  // →  \\ IndentIncrease
    Dedent,  // ←  \\ IndentDecrease

    // ─────────────────────────────────────────────
    // Доменные типы (Lacon)
    // ─────────────────────────────────────────────
    UnitDegree,    // deg \\ AngleDegree
    UnitRadian,    // rad \\ AngleRadian
    UnitPercent,   // %   \\ Percentage
    UnitLength,    // m   \\ LengthUnit
    UnitTime,      // s   \\ TimeUnit
    UnitFrequency, // Hz  \\ FrequencyUnit
    UnitSpeed,     // m/s \\ SpeedUnit
    UnitSize,      // B   \\ SizeUnit
    UnitFraction,  // /   \\ FractionUnit

    // ─────────────────────────────────────────────
    // Служебные
    // ─────────────────────────────────────────────
    Error,   // \\ LexicalError
    Unknown, // \\ UnknownToken
    Invalid, // \\ InvalidToken
    BOF,     // \\ BeginOfFile
    EOF,     // \\ EndOfFile
}
