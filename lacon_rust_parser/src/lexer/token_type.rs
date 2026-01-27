macro_rules! define_token_type {
    (
        $(#[$meta:meta])*
        pub enum $name:ident {
            common: { $($common_variant:ident),* $(,)? },
            units: { $($unit_variant:ident),* $(,)? }
        }
    ) => {
        $(#[$meta])*
        pub enum $name {
            $($common_variant,)*
            $($unit_variant,)*
        }

        impl $name {
            pub fn is_unit(&self) -> bool {
                match self {
                    $( $name::$unit_variant => true, )*
                    _ => false,
                }
            }
        }
    };
}

define_token_type! {
    #[derive(Debug, Clone, PartialEq)]
    pub enum TokenType {
        common: {
            // ─────────────────────────────────────────────
            // Служебные
            // ─────────────────────────────────────────────
            Illegal,
            Invalid, // \\ InvalidToken
            Error,   // \\ LexicalError
            Unknown, // \\ UnknownToken
            SOF,     // \\ StartOfFile
            EOF,     // \\ EndOfFile

            // ─────────────────────────────────────────────
            // Layout / whitespace-sensitive синтаксис
            // ─────────────────────────────────────────────
            Newline,        // \n \\ LineBreak
            CarriageReturn, // \r \\ CarriageReturn
            Indent,         // →  \\ IndentIncrease
            Dedent,         // ←  \\ IndentDecrease

            // ─────────────────────────────────────────────
            // Маркер
            // ─────────────────────────────────────────────
            Marker,

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
            ColonEqual,         // := \\ TypeOrLabel
            Backslash,          // \  \\ Escape or Difference
            BackslashBackslash, // \\ \\
            Question,           // ?  \\ Conditional / Nullable
            DollarLeftBrace,    // ${ \\ InterpolationStart

            // ─────────────────────────────────────────────
            // Арифметические и математические операторы
            // ─────────────────────────────────────────────
            Plus,       // +  \\ Add
            PlusMinus,  // +- \\ ± Tolerance
            DotPlus,    // .+ \\ Декартово произведение (∔)
            Minus,      // -  \\ Subtract / Negate
            DotMinus,   // .- \\ Monus (∸), 10 .- 20 = 0
            MinusPlus,  // -+ \\ Inverse Tolerance
            Star,       // * \\ Multiply
            Slash,      // /  \\ Divide
            SlashSlash, // // \\ IntegerDivide
            Percent,    // %  \\ Modulo

            // ─────────────────────────────────────────────
            // Инкременты и присваивания
            // ─────────────────────────────────────────────
            PlusPlus,        // ++ \\ Increment
            MinusMinus,      // -- \\ Decrement
            Equal,           // =  \\ Assign
            PlusEqual,       // += \\ AddAssign
            MinusEqual,      // -= \\ SubAssign
            StarEqual,       // *= \\ MulAssign
            SlashEqual,      // /= \\ DivAssign
            PercentEqual,    // %= \\ ModAssign
            SlashSlashEqual, // //= \\ IntDivAssign
            DotEqual,        // .= \\ Append / ConcatAssign

            // ─────────────────────────────────────────────
            // Сравнение и равенство
            // ─────────────────────────────────────────────
            Bang,                // !   \\ LogicalNot
            BangEqual,           // !=  \\ NotEqual
            EqualEqual,          // ==  \\ Equal
            EqualEqualEqual,     // === \\ StrictEqual (≣)
            Greater,             // >   \\ GreaterThan
            GreaterGreater,      // >>  \\ ShiftRight
            GreaterGreaterEqual, // >>= \\ ShiftRightAssign
            GreaterEqual,        // >=  \\ GreaterOrEqual
            Less,                // <   \\ LessThan
            LessLess,            // <<  \\ ShiftLeft
            LessLessEqual,       // <<= \\ ShiftLeftAssign
            LessEqual,           // <=  \\ LessOrEqual
            RegExEqual,          // ~=  \\ PatternMatch

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
            AndEqual,  // &= \\ BitwiseAndAssign
            OrEqual,   // |= \\ BitwiseOrAssign
            XorEqual,  // ^= \\ BitwiseXorAssign

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
            For,     // for  \\ LoopFor
            While,   // while\\ LoopWhile
            Loop,    // loop \\ InfiniteLoop
            Until,   // until \\ LoopUntil
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
            Variable,  // var  \\ VariableDecl
            Constant,  // const\\ ConstantDecl
            Structure, // struct \\ StructureDecl
            Import,  // import \\ ImportModule
            Export,  // export \\ ExportSymbol
            From,    // from \\ ImportSource
            Include, // include \\ IncludeFile
            New,     // new \\ NewInstance

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
            Origin, // origin \\ OriginSource, позволяет ссылаться на исходный объект (текущий статик)
            Super,  // super\\ BaseInstance (родительский статик)
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
            At,      // @ \\ AttributePrefix
            AtEqual, // @= \\ AttributeAssign
            Hash,    // # \\ Directive / Macro
            HashEqual, // #= \\ MacroAssign
            Dollar,  // $ \\ SpecialIdentifier
            DollarEqual, // $= \\ SpecialAssign

        },
        units: {
            UnitDegree, // deg \\ AngleDegree
            UnitRadian, // rad \\ AngleRadian
            UnitPercent, // %   \\ Percentage
            UnitLength, // m   \\ LengthUnit
            UnitTime, // s   \\ TimeUnit
            UnitFrequency, // Hz  \\ FrequencyUnit
            UnitVelocity, // m/s \\ SpeedUnit
            UnitAcceleration, // m/s2 \\ AccelerationUnit
            UnitJerk, // m/s3 \\ JerkUnit
            UnitSnap, // m/s4 \\ SnapUnit
            UnitCrackle, // m/s5 \\ CrackleUnit
            UnitPop, // m/s6 \\ PopUnit
            UnitSize, // B   \\ SizeUnit
            UnitBitRate, // bps \\ BitRate
            UnitMass, // g  \\ MassUnit
            UnitDensity, // kg/m3 \\ Density
            UnitAmount, // mol \\ Amount
            UnitFraction, // /   \\ FractionUnit
            UnitDimension, // DimensionalUnit
            UnitTemperature, // K \\ TemperatureUnit
            UnitElectricVoltage, // V \\ ElectricVoltage
            UnitElectricCurrent, // A \\ ElectricCurrent
            UnitElectricCharge, // C \\ ElectricCharge
            UnitElectricResistance, // Ω \\ ElectricResistance
            UnitElectricConductance, // S \\ ElectricConductance
            UnitElectricCapacitance, // F \\ ElectricCapacitance
            UnitElectricPower, // W \\ ElectricPower
            UnitLuminousIntensity, // cd \\ LuminousIntensity
            UnitLuminousFlux, // lm \\ LuminousFlux
            UnitIlluminance, // lx \\ Illuminance
            UnitPressure, // Pa  \\ PressureUnit
            UnitEnergy, // J  \\ EnergyUnit
            UnitForce, // N  \\ ForceUnit
            UnitArea, // m2 \\ AreaUnit
            UnitVolume, // m3 \\ VolumeUnit
        }
    }
}
