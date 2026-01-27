#[derive(Debug, Clone, PartialEq)]
pub enum TokenType {
    // ─────────────────────────────────────────────
    // Структурные символы / разделители
    // ─────────────────────────────────────────────
    LeftParen,          // (  \\ GroupStart
    RightParen,         // )  \\ GroupEnd
    LeftBrace,          // {  \\ BlockStart
    RightBrace,         // }  \\ BlockEnd
    LeftBracket,        // [  \\ IndexStart
    RightBracket,       // ]  \\ IndexEnd
    Comma,              // ,  \\ Separator
    Dot,                // .  \\ MemberAccess
    DotDot,             // ..  \\ Range
    DotDotDot,          // ... \\ Destructuring
    Semicolon,          // ;  \\ StatementEnd
    Colon,              // :  \\ TypeOrLabel
    ColonColon,         // :: \\ TypeOrLabel
    Backslash,          // \  \\ Escape or Difference
    BackslashBackslash, // \\ \\
    Question,           // ?  \\ Conditional / Nullable
    DollarLeftBrace,    // ${ \\ InterpolationStart

    // ─────────────────────────────────────────────
    // Арифметические операторы
    // ─────────────────────────────────────────────
    Plus,       // +  \\ Add
    Minus,      // -  \\ Subtract / Negate
    Star,       // *  \\ Multiply
    Slash,      // /  \\ Divide
    SlashSlash, // // \\ IntegerDivide
    Percent,    // %  \\ Modulo

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
    Identifier,         // name \\ Identifier
    Number,             // 123  \\ NumericLiteral
    NumberInfinity,     // inf  \\ NumericLiteral
    String,             // " "  \\ StringLiteral
    SingleQuotedString, // ' '  \\ StringLiteral
    GraveQuotedString,  // ` `  \\ StringLiteral
    MultilineString,    // """ \\ MultilineStringLiteral
    Placeholder,        // _    \\ Placeholder / PartialApply

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
    Until, // until \\ LoopUntil

    Spread,   // spread \\ ExpansionDirective
    Generate, // generate \\ GeneratorBlock

    Combine,   // combine \\ Combine
    Enumerate, // enumerate \\ Enumeration
    Filter,    // filter \\ Filter
    Flatten,   // flatten \\ Flatten
    Repeat,    // repeat \\ Repeat
    Transform, // transform \\ Transform
    Transpose, // transpose \\ Transpose

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

    Structure, // struct \\ StructureDecl

    Import,  // import \\ ImportModule
    Export,  // export \\ ExportSymbol
    From,    // from \\ ImportSource
    Include, // include \\ IncludeFile

    New, // new \\ NewInstance

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
    Contains,   // contains \\ CollectionContains
    With,       // with \\ Composition

    // ─────────────────────────────────────────────
    // Контекст объекта
    // ─────────────────────────────────────────────
    This,   // this \\ CurrentInstance
    Super,  // super\\ BaseInstance
    Root,   // root \\ ObjectRoot
    Parent, // parent \\ CurrentParent
    Here,   // here \\ CurrentLocation

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
    // Маркер
    // ─────────────────────────────────────────────
    Marker,

    // ─────────────────────────────────────────────
    // Layout / whitespace-sensitive синтаксис
    // ─────────────────────────────────────────────
    Newline, // \n \\ LineBreak
    Indent,  // →  \\ IndentIncrease
    Dedent,  // ←  \\ IndentDecrease

    // ─────────────────────────────────────────────
    // Доменные типы (Lacon)
    // ─────────────────────────────────────────────
    UnitDegree,              // deg \\ AngleDegree
    UnitRadian,              // rad \\ AngleRadian
    UnitPercent,             // %   \\ Percentage
    UnitLength,              // m   \\ LengthUnit
    UnitTime,                // s   \\ TimeUnit
    UnitFrequency,           // Hz  \\ FrequencyUnit
    UnitVelocity,            // m/s \\ SpeedUnit
    UnitAcceleration,        // m/s2 \\ AccelerationUnit
    UnitJerk,                // m/s3 \\ JerkUnit
    UnitSnap,                // m/s4 \\ SnapUnit
    UnitCrackle,             // m/s5 \\ CrackleUnit
    UnitPop,                 // m/s6 \\ PopUnit
    UnitSize,                // B   \\ SizeUnit
    UnitBitRate,             // bps \\ BitRate
    UnitMass,                // g  \\ MassUnit
    UnitDensity,             // kg/m3 \\ Density
    UnitAmount,              // mol \\ Amount
    UnitFraction,            // /   \\ FractionUnit
    UnitDimension,           // DimensionalUnit
    UnitTemperature,         // K \\ TemperatureUnit
    UnitElectricVoltage,     // V \\ ElectricVoltage
    UnitElectricCurrent,     // A \\ ElectricCurrent
    UnitElectricCharge,      // C \\ ElectricCharge
    UnitElectricResistance,  // Ω \\ ElectricResistance
    UnitElectricConductance, // S \\ ElectricConductance
    UnitElectricCapacitance, // F \\ ElectricCapacitance
    UnitElectricPower,       // W \\ ElectricPower
    UnitLuminousIntensity,   // cd \\ LuminousIntensity
    UnitLuminousFlux,        // lm \\ LuminousFlux
    UnitIlluminance,         // lx \\ Illuminance
    UnitPressure,            // Pa  \\ PressureUnit
    UnitEnergy,              // J  \\ EnergyUnit
    UnitForce,               // N  \\ ForceUnit
    UnitArea,                // m2 \\ AreaUnit
    UnitVolume,              // m3 \\ VolumeUnit

    // ─────────────────────────────────────────────
    // Служебные
    // ─────────────────────────────────────────────
    Error,   // \\ LexicalError
    Unknown, // \\ UnknownToken
    Invalid, // \\ InvalidToken
    BOF,     // \\ BeginOfFile
    EOF,     // \\ EndOfFile
}
