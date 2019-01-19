    ORG 0
CODE_0000:
    ACALL   CODE_0000
    ;ACALL   CODE_0100
    ACALL   CODE_01FF
    ACALL   CODE_0200
    ACALL   CODE_02FF
    ACALL   CODE_0300
    ACALL   CODE_03FF
    ACALL   CODE_0400
    ACALL   CODE_04FF
    ACALL   CODE_0500
    ACALL   CODE_05FF
    ACALL   CODE_0600
    ACALL   CODE_06FF
    ACALL   CODE_0700
    ACALL   CODE_07FF

    ;ACALL   CODE_FFFF  ; 越界

    ADD     A, #0FFh
    ADD     A, 0FFh
    ADD     A, @R0
    ADD     A, @R1
    ADD     A, R0
    ADD     A, R1
    ADD     A, R2
    ADD     A, R3
    ADD     A, R4
    ADD     A, R5
    ADD     A, R6
    ADD     A, R7

    ADDC    A, #0FFh
    ADDC    A, 0FFh
    ADDC    A, @R0
    ADDC    A, @R1
    ADDC    A, R0
    ADDC    A, R1
    ADDC    A, R2
    ADDC    A, R3
    ADDC    A, R4
    ADDC    A, R5
    ADDC    A, R6
    ADDC    A, R7

    AJMP    CODE_0000
    ;AJMP    CODE_0100
    AJMP    CODE_01FF
    AJMP    CODE_0200
    AJMP    CODE_02FF
    AJMP    CODE_0300
    AJMP    CODE_03FF
    AJMP    CODE_0400
    AJMP    CODE_04FF
    AJMP    CODE_0500
    AJMP    CODE_05FF
    AJMP    CODE_0600
    AJMP    CODE_06FF
    AJMP    CODE_0700
    AJMP    CODE_07FF

    ;AJMP    CODE_FFFF  ; 越界

    ANL     0FFh, A
    ANL     0FFh, #0FFh
    ANL     A, #0FFh
    ANL     A, 0FFh
    ANL     A, @R0
    ANL     A, @R1
    ANL     A, R0
    ANL     A, R1
    ANL     A, R2
    ANL     A, R3
    ANL     A, R4
    ANL     A, R5
    ANL     A, R6
    ANL     A, R7
    ANL     C, 0FFh
    ANL     C, /0FFh

    CJNE    A, #0FFh, $+3
    CJNE    A, 0FFh, $+3
    CJNE    @R0, #0FFh, $+3
    CJNE    @R1, #0FFh, $+3
    CJNE    R0, #0FFh, $+3
    CJNE    R1, #0FFh, $+3
    CJNE    R2, #0FFh, $+3
    CJNE    R3, #0FFh, $+3
    CJNE    R4, #0FFh, $+3
    CJNE    R5, #0FFh, $+3
    CJNE    R6, #0FFh, $+3
    CJNE    R7, #0FFh, $+3

    CJNE    R0, #0FFh, $-3
    ;CJNE    R0, #0FFh, $-200    ; 越界
    ;CJNE    R0, #0FFh, $+200    ; 越界

    CLR     0FFh
    CLR     C
    CLR     A

    CPL     A
    CPL     C
    CPL     0FFh

    DA      A

    DEC     A
    DEC     0FFh
    DEC     @R0
    DEC     @R1
    DEC     R0
    DEC     R1
    DEC     R2
    DEC     R3
    DEC     R4
    DEC     R5
    DEC     R6
    DEC     R7

    DIV     AB

    DJNZ    0FFh, $+3
    DJNZ    R0, $+4
    DJNZ    R1, $+4
    DJNZ    R2, $+4
    DJNZ    R3, $+4
    DJNZ    R4, $+4
    DJNZ    R5, $+4
    DJNZ    R6, $+4
    DJNZ    R7, $

    INC     A
    INC     0FFh
    INC     @R0
    INC     @R1
    INC     R0
    INC     R1
    INC     R2
    INC     R3
    INC     R4
    INC     R5
    INC     R6
    INC     R7
    INC     DPTR

    JB      0FFh, $+3

    JBC     0FFh, $+3

    JC      $+3

    JMP     @A+DPTR

    JNB     0FFh, $+3

    JNC     $

    JNZ     $

    JZ      $

    LCALL   CODE_FFFF

    LJMP    CODE_FFFF

    MOV     @R0, #0FFh
    MOV     @R1, #0FFh
    MOV     @R0, A
    MOV     @R1, A
    MOV     @R0, 0FFh
    MOV     @R1, 0FFh
    MOV     A, #0FFh
    MOV     A, @R0
    MOV     A, @R1
    MOV     A, R0
    MOV     A, R1
    MOV     A, R2
    MOV     A, R3
    MOV     A, R4
    MOV     A, R5
    MOV     A, R6
    MOV     A, R7
    MOV     A, 0FFh
    MOV     C, 0FFh
    MOV     DPTR, #0FFFFh
    MOV     R0, #0FFh
    MOV     R1, #0FFh
    MOV     R2, #0FFh
    MOV     R3, #0FFh
    MOV     R4, #0FFh
    MOV     R5, #0FFh
    MOV     R6, #0FFh
    MOV     R7, #0FFh
    MOV     R0, A
    MOV     R1, A
    MOV     R2, A
    MOV     R3, A
    MOV     R4, A
    MOV     R5, A
    MOV     R6, A
    MOV     R7, A
    MOV     R0, 0FFh
    MOV     R1, 0FFh
    MOV     R2, 0FFh
    MOV     R3, 0FFh
    MOV     R4, 0FFh
    MOV     R5, 0FFh
    MOV     R6, 0FFh
    MOV     R7, 0FFh
    MOV     0FFh, C
    MOV     0FFh, #0FFh
    MOV     0FFh, @R0
    MOV     0FFh, @R1
    MOV     0FFh, R0
    MOV     0FFh, R1
    MOV     0FFh, R2
    MOV     0FFh, R3
    MOV     0FFh, R4
    MOV     0FFh, R5
    MOV     0FFh, R6
    MOV     0FFh, R7
    MOV     0FFh, A
    MOV     0FFh, 0FFh

    MOVC    A, @A+DPTR
    MOVC    A, @A+PC

    MOVX    @DPTR, A
    MOVX    @R0, A
    MOVX    @R1, A
    MOVX    A, @DPTR
    MOVX    A, @R0
    MOVX    A, @R1

    MUL     AB

    NOP

    ORL     0FFh, A
    ORL     0FFh, #0FFh
    ORL     A, #0FFh
    ORL     A, 0FFh
    ORL     A, @R0
    ORL     A, @R1
    ORL     A, R0
    ORL     A, R1
    ORL     A, R2
    ORL     A, R3
    ORL     A, R4
    ORL     A, R5
    ORL     A, R6
    ORL     A, R7
    ORL     C, 0FFh
    ORL     C, /0FFh

    POP     0FFh

    PUSH    0FFh

    RET

    RETI

    RL      A

    RLC     A

    RR      A
    RRC     A

    SETB    C

SJMP_PREV:
    SETB    0FFh

SJMP_CUR:
    SJMP    SJMP_CUR
    SJMP    SJMP_PREV
    SJMP    SJMP_NEXT

SJMP_NEXT:
    SUBB    A, #0FFh
    SUBB    A, 0FFh
    SUBB    A, @R0
    SUBB    A, @R1
    SUBB    A, R0
    SUBB    A, R1
    SUBB    A, R2
    SUBB    A, R3
    SUBB    A, R4
    SUBB    A, R5
    SUBB    A, R6
    SUBB    A, R7

    SWAP    A

    ;0xA5 - <UNKNOWN>

    XCH     A, @R0
    XCH     A, @R1
    XCH     A, R0
    XCH     A, R1
    XCH     A, R2
    XCH     A, R3
    XCH     A, R4
    XCH     A, R5
    XCH     A, R6
    XCH     A, R7
    XCH     A, 0FFh

    XCHD    A, @R0
    XCHD    A, @R1

    XRL     0FFh, A
    XRL     0FFh, #0FFh
    XRL     A, #0FFh
    XRL     A, 0FFh
    XRL     A, @R0
    XRL     A, @R1
    XRL     A, R0
    XRL     A, R1
    XRL     A, R2
    XRL     A, R3
    XRL     A, R4
    XRL     A, R5
    XRL     A, R6
    XRL     A, R7

;---------------------------------------

    ;ORG 00100h
;CODE_0100:
    ;NOP

    ORG 001FFh
CODE_01FF:
    NOP

    ORG 00200h
CODE_0200:
    NOP

    ORG 002FFh
CODE_02FF:
    NOP

    ORG 00300h
CODE_0300:
    NOP

    ORG 003FFh
CODE_03FF:
    NOP

    ORG 00400h
CODE_0400:
    NOP

    ORG 004FFh
CODE_04FF:
    NOP

    ORG 00500h
CODE_0500:
    NOP

    ORG 005FFh
CODE_05FF:
    NOP

    ORG 00600h
CODE_0600:
    NOP

    ORG 006FFh
CODE_06FF:
    NOP

    ORG 00700h
CODE_0700:
    NOP

    ORG 007FFh
CODE_07FF:
    NOP

    ORG 0FFFFh
CODE_FFFF:
    NOP

    END