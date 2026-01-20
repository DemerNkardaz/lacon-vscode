/**
 * Типы данных для парсера LACON
 */

export interface ParserState {
    result: any;
    stack: any[];
    indentStack: number[];
    variableRegistry: Record<string, string>;
    exportValue: any;
    hasExport: boolean;
    
    // Multiline state
    isMultiline: boolean;
    isRawMultiline: boolean;
    multilineKey: string;
    multilineContent: string[];
    isExportMultiline: boolean;
    
    // Array state
    isArrayMode: boolean;
    arrayKey: string;
    arrayContent: any[];
    isExportArray: boolean;
    
    // Block state
    isBlockMode: boolean;
    blockKey: string;
    isExportBlock: boolean;
    isCommentBlock: boolean;
}

export interface ParsedValue {
    __lacon_spread__?: boolean;
    value?: any;
}

export interface KeyPosition {
    key: string;
    start: number;
    valueStart: number;
    isMulti: boolean;
    isImport: boolean;
}
