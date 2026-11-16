// Author: kamekingdom (2026-09-29)

(() => {

  /* =========================================================
     Types
     ========================================================= */

  /**
   * @typedef {number|string|null} SheetValue
   */

  /**
   * @typedef {{
   *   ok: true,
   *   value: SheetValue
   * } | {
   *   ok: false,
   *   error: string
   * }} EvalResult
   */

  /**
   * @typedef {{
   *   element: HTMLElement,
   *   source: string,
   *   row: number,
   *   col: number
   * }} SheetCell
   */

  /**
   * @typedef {
   *   Window
   *   & typeof globalThis
   *   & {
   *     __kameSpreadsheetController?: AbortController
   *   }
   * } KameWindow
   */


  /* =========================================================
     Initialization
     ========================================================= */

  /** @type {KameWindow} */
  const kameWindow =
    /** @type {KameWindow} */ (window);


  if (
    kameWindow.__kameSpreadsheetController
  ) {

    kameWindow
      .__kameSpreadsheetController
      .abort();
  }


  /** @type {AbortController} */
  const controller =
    new AbortController();


  /** @type {AbortSignal} */
  const signal =
    controller.signal;


  kameWindow.__kameSpreadsheetController =
    controller;


  /* =========================================================
     Error
     ========================================================= */

  class FormulaError extends Error {

    /**
     * @param {string} code
     */
    constructor(
      code
    ) {

      super(
        code
      );


      this.name =
        'FormulaError';


      this.code =
        code;
    }
  }


  /* =========================================================
     State
     ========================================================= */

  /** @type {number | null} */
  let refreshFrame =
    null;


  /** @type {MutationObserver | null} */
  let observer =
    null;


  /* =========================================================
     Cell Source
     ========================================================= */

  /**
   * 計算結果表示用spanを除外して
   * 元々のセル文字列を取得。
   *
   * @param {HTMLElement} cell
   * @returns {string}
   */
  function getCellSource(
    cell
  ) {

    /** @type {HTMLElement} */
    const clone =
      /** @type {HTMLElement} */ (
        cell.cloneNode(
          true
        )
      );


    clone
      .querySelectorAll(
        '.kame-sheet-result'
      )
      .forEach(
        element => {

          element.remove();
        }
      );


    return (
      clone.textContent ||
      ''
    ).trim();
  }


  /* =========================================================
     Table Detection
     ========================================================= */

  /**
   * 連続しているtable行を
   * 1つのSpreadsheetとしてまとめる。
   *
   * @returns {HTMLElement[][]}
   */
  function collectTables() {

    /** @type {HTMLElement[]} */
    const lines =
      Array.from(
        document.querySelectorAll(
          '.lines > .line'
        )
      );


    /** @type {HTMLElement[][]} */
    const tables =
      [];


    /** @type {HTMLElement[]} */
    let current =
      [];


    for (
      const line
      of lines
    ) {

      /** @type {HTMLElement | null} */
      const tableBlock =
        /** @type {HTMLElement | null} */ (
          line.querySelector(
            '.table-block'
          )
        );


      const cells =
        tableBlock
          ? Array.from(
              tableBlock.querySelectorAll(
                '.cell'
              )
            )
          : [];


      /*
       * table row
       */
      if (
        tableBlock &&
        cells.length >
          0
      ) {

        current.push(
          line
        );


        continue;
      }


      /*
       * table終了。
       */
      if (
        current.length >
        0
      ) {

        tables.push(
          current
        );


        current =
          [];
      }
    }


    if (
      current.length >
      0
    ) {

      tables.push(
        current
      );
    }


    return tables;
  }


  /**
   * table DOMをmatrix化。
   *
   * @param {HTMLElement[]} rows
   * @returns {SheetCell[][]}
   */
  function createMatrix(
    rows
  ) {

    return (
      rows.map(
        (
          line,
          row
        ) => {

          /** @type {HTMLElement[]} */
          const cells =
            Array.from(
              line.querySelectorAll(
                '.table-block .cell'
              )
            );


          return (
            cells.map(
              (
                element,
                col
              ) => {

                return {
                  element,

                  source:
                    getCellSource(
                      element
                    ),

                  row,

                  col
                };
              }
            )
          );
        }
      )
    );
  }


  /* =========================================================
     Cell Address
     ========================================================= */

  /**
   * A -> 0
   * B -> 1
   * Z -> 25
   * AA -> 26
   *
   * @param {string} label
   * @returns {number}
   */
  function columnLabelToIndex(
    label
  ) {

    /** @type {number} */
    let value =
      0;


    const upper =
      label.toUpperCase();


    for (
      const character
      of upper
    ) {

      value =
        value *
          26 +
        (
          character.charCodeAt(
            0
          ) -
          64
        );
    }


    return (
      value -
      1
    );
  }


  /**
   * A1 → row:0 col:0
   *
   * $A$1にも対応。
   *
   * @param {string} reference
   * @returns {{row:number,col:number}}
   */
  function parseCellReference(
    reference
  ) {

    const match =
      reference.match(
        /^\$?([A-Za-z]+)\$?([1-9]\d*)$/
      );


    if (
      !match
    ) {

      throw new FormulaError(
        '#REF!'
      );
    }


    return {
      col:
        columnLabelToIndex(
          match[1]
        ),

      row:
        Number(
          match[2]
        ) -
        1
    };
  }


  /* =========================================================
     Tokenizer
     ========================================================= */

  /**
   * @typedef {{
   *   type: string,
   *   value: string
   * }} Token
   */


  /**
   * @param {string} expression
   * @returns {Token[]}
   */
  function tokenize(
    expression
  ) {

    /** @type {Token[]} */
    const tokens =
      [];


    let index =
      0;


    while (
      index <
      expression.length
    ) {

      const rest =
        expression.slice(
          index
        );


      /* -----------------------------------------------------
         Whitespace
         ----------------------------------------------------- */

      const whitespace =
        rest.match(
          /^\s+/
        );


      if (
        whitespace
      ) {

        index +=
          whitespace[0].length;


        continue;
      }


      /* -----------------------------------------------------
         Number
         ----------------------------------------------------- */

      const number =
        rest.match(
          /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
        );


      if (
        number
      ) {

        tokens.push({
          type:
            'number',

          value:
            number[0]
        });


        index +=
          number[0].length;


        continue;
      }


      /* -----------------------------------------------------
         Cell Reference
         ----------------------------------------------------- */

      const reference =
        rest.match(
          /^\$?[A-Za-z]+\$?[1-9]\d*/
        );


      if (
        reference
      ) {

        tokens.push({
          type:
            'reference',

          value:
            reference[0]
        });


        index +=
          reference[0].length;


        continue;
      }


      /* -----------------------------------------------------
         Identifier
         ----------------------------------------------------- */

      const identifier =
        rest.match(
          /^[A-Za-z_][A-Za-z0-9_]*/
        );


      if (
        identifier
      ) {

        tokens.push({
          type:
            'identifier',

          value:
            identifier[0]
        });


        index +=
          identifier[0].length;


        continue;
      }


      /* -----------------------------------------------------
         Operator
         ----------------------------------------------------- */

      const character =
        rest[0];


      if (
        '+-*/^(),:'.includes(
          character
        )
      ) {

        tokens.push({
          type:
            character,

          value:
            character
        });


        index +=
          1;


        continue;
      }


      throw new FormulaError(
        '#ERROR!'
      );
    }


    tokens.push({
      type:
        'eof',

      value:
        ''
    });


    return tokens;
  }


  /* =========================================================
     Value Utilities
     ========================================================= */

  /**
   * @param {SheetValue | SheetValue[]} value
   * @returns {number}
   */
  function toNumber(
    value
  ) {

    if (
      Array.isArray(
        value
      )
    ) {

      throw new FormulaError(
        '#VALUE!'
      );
    }


    if (
      value ===
      null
    ) {

      return 0;
    }


    if (
      typeof value ===
      'number'
    ) {

      return value;
    }


    throw new FormulaError(
      '#VALUE!'
    );
  }


  /**
   * @param {(SheetValue|SheetValue[])[]} values
   * @returns {SheetValue[]}
   */
  function flattenValues(
    values
  ) {

    /** @type {SheetValue[]} */
    const result =
      [];


    for (
      const value
      of values
    ) {

      if (
        Array.isArray(
          value
        )
      ) {

        result.push(
          ...value
        );

      } else {

        result.push(
          value
        );
      }
    }


    return result;
  }


  /* =========================================================
     Formula Parser
     ========================================================= */

  class Parser {

    /**
     * @param {Token[]} tokens
     * @param {(reference:string) => SheetValue} resolveCell
     * @param {(start:string,end:string) => SheetValue[]} resolveRange
     */
    constructor(
      tokens,
      resolveCell,
      resolveRange
    ) {

      this.tokens =
        tokens;


      this.index =
        0;


      this.resolveCell =
        resolveCell;


      this.resolveRange =
        resolveRange;
    }


    /**
     * @returns {Token}
     */
    current() {

      return (
        this.tokens[
          this.index
        ]
      );
    }


    /**
     * @param {string} type
     * @returns {boolean}
     */
    is(
      type
    ) {

      return (
        this.current().type ===
        type
      );
    }


    /**
     * @param {string} type
     * @returns {Token}
     */
    consume(
      type
    ) {

      const token =
        this.current();


      if (
        token.type !==
        type
      ) {

        throw new FormulaError(
          '#ERROR!'
        );
      }


      this.index +=
        1;


      return token;
    }


    /**
     * @returns {SheetValue | SheetValue[]}
     */
    parse() {

      const value =
        this.parseExpression();


      if (
        !this.is(
          'eof'
        )
      ) {

        throw new FormulaError(
          '#ERROR!'
        );
      }


      return value;
    }


    /**
     * + -
     *
     * @returns {SheetValue | SheetValue[]}
     */
    parseExpression() {

      let left =
        this.parseTerm();


      while (
        this.is(
          '+'
        ) ||
        this.is(
          '-'
        )
      ) {

        const operator =
          this.current().type;


        this.index +=
          1;


        const right =
          this.parseTerm();


        const leftNumber =
          toNumber(
            left
          );


        const rightNumber =
          toNumber(
            right
          );


        left =
          operator === '+'
            ? leftNumber +
              rightNumber
            : leftNumber -
              rightNumber;
      }


      return left;
    }


    /**
     * * /
     *
     * @returns {SheetValue | SheetValue[]}
     */
    parseTerm() {

      let left =
        this.parsePower();


      while (
        this.is(
          '*'
        ) ||
        this.is(
          '/'
        )
      ) {

        const operator =
          this.current().type;


        this.index +=
          1;


        const right =
          this.parsePower();


        const leftNumber =
          toNumber(
            left
          );


        const rightNumber =
          toNumber(
            right
          );


        if (
          operator === '/'
          &&
          rightNumber ===
            0
        ) {

          throw new FormulaError(
            '#DIV/0!'
          );
        }


        left =
          operator === '*'
            ? leftNumber *
              rightNumber
            : leftNumber /
              rightNumber;
      }


      return left;
    }


    /**
     * ^
     *
     * @returns {SheetValue | SheetValue[]}
     */
    parsePower() {

      let left =
        this.parseUnary();


      if (
        this.is(
          '^'
        )
      ) {

        this.index +=
          1;


        const right =
          this.parsePower();


        left =
          Math.pow(
            toNumber(
              left
            ),
            toNumber(
              right
            )
          );
      }


      return left;
    }


    /**
     * unary +/-
     *
     * @returns {SheetValue | SheetValue[]}
     */
    parseUnary() {

      if (
        this.is(
          '+'
        )
      ) {

        this.index +=
          1;


        return (
          toNumber(
            this.parseUnary()
          )
        );
      }


      if (
        this.is(
          '-'
        )
      ) {

        this.index +=
          1;


        return (
          -toNumber(
            this.parseUnary()
          )
        );
      }


      return (
        this.parsePrimary()
      );
    }


    /**
     * @returns {SheetValue | SheetValue[]}
     */
    parsePrimary() {

      /* -----------------------------------------------------
         Number
         ----------------------------------------------------- */

      if (
        this.is(
          'number'
        )
      ) {

        return (
          Number(
            this.consume(
              'number'
            ).value
          )
        );
      }


      /* -----------------------------------------------------
         Cell / Range
         ----------------------------------------------------- */

      if (
        this.is(
          'reference'
        )
      ) {

        const start =
          this.consume(
            'reference'
          ).value;


        /*
         * A1:B5
         */
        if (
          this.is(
            ':'
          )
        ) {

          this.consume(
            ':'
          );


          const end =
            this.consume(
              'reference'
            ).value;


          return (
            this.resolveRange(
              start,
              end
            )
          );
        }


        return (
          this.resolveCell(
            start
          )
        );
      }


      /* -----------------------------------------------------
         Function
         ----------------------------------------------------- */

      if (
        this.is(
          'identifier'
        )
      ) {

        const name =
          this.consume(
            'identifier'
          )
            .value
            .toUpperCase();


        this.consume(
          '('
        );


        /** @type {(SheetValue|SheetValue[])[]} */
        const args =
          [];


        if (
          !this.is(
            ')'
          )
        ) {

          while (
            true
          ) {

            args.push(
              this.parseExpression()
            );


            if (
              this.is(
                ','
              )
            ) {

              this.consume(
                ','
              );


              continue;
            }


            break;
          }
        }


        this.consume(
          ')'
        );


        return (
          this.callFunction(
            name,
            args
          )
        );
      }


      /* -----------------------------------------------------
         Parentheses
         ----------------------------------------------------- */

      if (
        this.is(
          '('
        )
      ) {

        this.consume(
          '('
        );


        const value =
          this.parseExpression();


        this.consume(
          ')'
        );


        return value;
      }


      throw new FormulaError(
        '#ERROR!'
      );
    }


    /**
     * @param {string} name
     * @param {(SheetValue|SheetValue[])[]} args
     * @returns {SheetValue}
     */
    callFunction(
      name,
      args
    ) {

      const values =
        flattenValues(
          args
        );


      const numbers =
        values.filter(
          value => (
            typeof value ===
            'number'
          )
        );


      switch (
        name
      ) {

        /* ---------------------------------------------------
           SUM
           --------------------------------------------------- */

        case 'SUM':

          return (
            numbers.reduce(
              (
                total,
                value
              ) => (
                total +
                value
              ),
              0
            )
          );


        /* ---------------------------------------------------
           AVERAGE
           --------------------------------------------------- */

        case 'AVERAGE':

          if (
            numbers.length ===
            0
          ) {

            throw new FormulaError(
              '#DIV/0!'
            );
          }


          return (
            numbers.reduce(
              (
                total,
                value
              ) => (
                total +
                value
              ),
              0
            ) /
            numbers.length
          );


        /* ---------------------------------------------------
           MIN
           --------------------------------------------------- */

        case 'MIN':

          return (
            numbers.length >
            0
              ? Math.min(
                  ...numbers
                )
              : 0
          );


        /* ---------------------------------------------------
           MAX
           --------------------------------------------------- */

        case 'MAX':

          return (
            numbers.length >
            0
              ? Math.max(
                  ...numbers
                )
              : 0
          );


        /* ---------------------------------------------------
           COUNT
           --------------------------------------------------- */

        case 'COUNT':

          return (
            numbers.length
          );


        /* ---------------------------------------------------
           ROUND
           --------------------------------------------------- */

        case 'ROUND': {

          if (
            args.length <
            1
          ) {

            throw new FormulaError(
              '#ERROR!'
            );
          }


          const number =
            toNumber(
              args[0]
            );


          const digits =
            args.length >=
            2
              ? toNumber(
                  args[1]
                )
              : 0;


          const factor =
            Math.pow(
              10,
              digits
            );


          return (
            Math.round(
              number *
              factor
            ) /
            factor
          );
        }


        /* ---------------------------------------------------
           ABS
           --------------------------------------------------- */

        case 'ABS':

          return (
            Math.abs(
              toNumber(
                args[0] ??
                null
              )
            )
          );


        default:

          throw new FormulaError(
            '#NAME?'
          );
      }
    }
  }


  /* =========================================================
     Table Evaluation
     ========================================================= */

  /**
   * @param {SheetCell[][]} matrix
   * @returns {Map<string, EvalResult>}
   */
  function evaluateTable(
    matrix
  ) {

    /** @type {Map<string, EvalResult>} */
    const cache =
      new Map();


    /** @type {Set<string>} */
    const visiting =
      new Set();


    const rowCount =
      matrix.length;


    const columnCount =
      Math.max(
        0,
        ...matrix.map(
          row => (
            row.length
          )
        )
      );


    /**
     * @param {number} row
     * @param {number} col
     * @returns {EvalResult}
     */
    function evaluateCell(
      row,
      col
    ) {

      if (
        row <
          0 ||
        col <
          0 ||
        row >=
          rowCount ||
        col >=
          columnCount
      ) {

        return {
          ok:
            false,

          error:
            '#REF!'
        };
      }


      const key =
        `${row}:${col}`;


      const cached =
        cache.get(
          key
        );


      if (
        cached
      ) {

        return cached;
      }


      if (
        visiting.has(
          key
        )
      ) {

        return {
          ok:
            false,

          error:
            '#CYCLE!'
        };
      }


      const cell =
        matrix[row]?.[col];


      /*
       * 行内に実セルが存在しない場合は
       * 空セルとして扱う。
       */
      if (
        !cell
      ) {

        const result =
          /** @type {EvalResult} */ ({
            ok:
              true,

            value:
              null
          });


        cache.set(
          key,
          result
        );


        return result;
      }


      const source =
        cell.source.trim();


      /* -----------------------------------------------------
         Blank
         ----------------------------------------------------- */

      if (
        source ===
        ''
      ) {

        const result =
          /** @type {EvalResult} */ ({
            ok:
              true,

            value:
              null
          });


        cache.set(
          key,
          result
        );


        return result;
      }


      /* -----------------------------------------------------
         Normal Cell
         ----------------------------------------------------- */

      if (
        !source.startsWith(
          '='
        )
      ) {

        /*
         * 1,200 にも対応。
         */
        const numericSource =
          source.replace(
            /,/g,
            ''
          );


        const number =
          Number(
            numericSource
          );


        const value =
          numericSource !==
            '' &&
          Number.isFinite(
            number
          )
            ? number
            : source;


        const result =
          /** @type {EvalResult} */ ({
            ok:
              true,

            value
          });


        cache.set(
          key,
          result
        );


        return result;
      }


      /* -----------------------------------------------------
         Formula
         ----------------------------------------------------- */

      visiting.add(
        key
      );


      try {

        const expression =
          source.slice(
            1
          );


        const parser =
          new Parser(
            tokenize(
              expression
            ),

            reference => {

              const position =
                parseCellReference(
                  reference
                );


              const result =
                evaluateCell(
                  position.row,
                  position.col
                );


              if (
                !result.ok
              ) {

                throw new FormulaError(
                  result.error
                );
              }


              return (
                result.value
              );
            },

            (
              startReference,
              endReference
            ) => {

              const start =
                parseCellReference(
                  startReference
                );


              const end =
                parseCellReference(
                  endReference
                );


              const startRow =
                Math.min(
                  start.row,
                  end.row
                );


              const endRow =
                Math.max(
                  start.row,
                  end.row
                );


              const startCol =
                Math.min(
                  start.col,
                  end.col
                );


              const endCol =
                Math.max(
                  start.col,
                  end.col
                );


              /** @type {SheetValue[]} */
              const values =
                [];


              for (
                let currentRow =
                  startRow;

                currentRow <=
                  endRow;

                currentRow++
              ) {

                for (
                  let currentCol =
                    startCol;

                  currentCol <=
                    endCol;

                  currentCol++
                ) {

                  const result =
                    evaluateCell(
                      currentRow,
                      currentCol
                    );


                  if (
                    !result.ok
                  ) {

                    throw new FormulaError(
                      result.error
                    );
                  }


                  values.push(
                    result.value
                  );
                }
              }


              return values;
            }
          );


        const parsedValue =
          parser.parse();


        if (
          Array.isArray(
            parsedValue
          )
        ) {

          throw new FormulaError(
            '#VALUE!'
          );
        }


        const result =
          /** @type {EvalResult} */ ({
            ok:
              true,

            value:
              parsedValue
          });


        cache.set(
          key,
          result
        );


        return result;

      } catch (
        error
      ) {

        const result =
          /** @type {EvalResult} */ ({
            ok:
              false,

            error:
              error instanceof FormulaError
                ? error.code
                : '#ERROR!'
          });


        cache.set(
          key,
          result
        );


        return result;

      } finally {

        visiting.delete(
          key
        );
      }
    }


    /*
     * 全セルを計算。
     */
    for (
      let row = 0;
      row < rowCount;
      row++
    ) {

      for (
        let col = 0;
        col < columnCount;
        col++
      ) {

        evaluateCell(
          row,
          col
        );
      }
    }


    return cache;
  }


  /* =========================================================
     Formatting
     ========================================================= */

  /**
   * @param {EvalResult} result
   * @returns {string}
   */
  function formatResult(
    result
  ) {

    if (
      !result.ok
    ) {

      return (
        result.error
      );
    }


    const value =
      result.value;


    if (
      value ===
      null
    ) {

      return '';
    }


    if (
      typeof value ===
      'number'
    ) {

      if (
        !Number.isFinite(
          value
        )
      ) {

        return '#NUM!';
      }


      if (
        Object.is(
          value,
          -0
        )
      ) {

        return '0';
      }


      /*
       * JSの
       * 0.1 + 0.2 =
       * 0.30000000000000004
       *
       * のような誤差を軽減。
       */
      return (
        String(
          Number(
            value.toPrecision(
              12
            )
          )
        )
      );
    }


    return (
      String(
        value
      )
    );
  }


  /* =========================================================
     Render
     ========================================================= */

  /**
   * @param {HTMLElement} cell
   * @param {string} formula
   * @param {string} result
   * @returns {void}
   */
  function renderFormulaCell(
    cell,
    formula,
    result
  ) {

    cell.classList.add(
      'kame-sheet-formula-cell'
    );


    cell.dataset.kameSheetFormula =
      formula;


    /** @type {HTMLSpanElement | null} */
    let resultElement =
      cell.querySelector(
        ':scope > .kame-sheet-result'
      );


    if (
      !resultElement
    ) {

      resultElement =
        document.createElement(
          'span'
        );


      resultElement.className =
        'kame-sheet-result';


      resultElement.setAttribute(
        'aria-hidden',
        'true'
      );


      cell.appendChild(
        resultElement
      );
    }


    if (
      resultElement.textContent !==
      result
    ) {

      resultElement.textContent =
        result;
    }


    cell.title =
      formula;
  }


  /**
   * @param {HTMLElement} cell
   * @returns {void}
   */
  function clearFormulaCell(
    cell
  ) {

    cell.classList.remove(
      'kame-sheet-formula-cell'
    );


    delete (
      cell.dataset.kameSheetFormula
    );


    cell
      .querySelector(
        ':scope > .kame-sheet-result'
      )
      ?.remove();


    if (
      cell.title.startsWith(
        '='
      )
    ) {

      cell.removeAttribute(
        'title'
      );
    }
  }


  /* =========================================================
     Refresh
     ========================================================= */

  /**
   * @returns {void}
   */
  function refresh() {

    /** @type {Set<HTMLElement>} */
    const activeFormulaCells =
      new Set();


    const tables =
      collectTables();


    for (
      const rows
      of tables
    ) {

      const matrix =
        createMatrix(
          rows
        );


      const results =
        evaluateTable(
          matrix
        );


      for (
        let row = 0;
        row < matrix.length;
        row++
      ) {

        for (
          let col = 0;
          col < matrix[row].length;
          col++
        ) {

          const cell =
            matrix[row][col];


          const source =
            cell.source.trim();


          if (
            !source.startsWith(
              '='
            )
          ) {

            clearFormulaCell(
              cell.element
            );


            continue;
          }


          activeFormulaCells.add(
            cell.element
          );


          const key =
            `${row}:${col}`;


          const result =
            results.get(
              key
            );


          if (
            !result
          ) {

            continue;
          }


          renderFormulaCell(
            cell.element,
            source,
            formatResult(
              result
            )
          );
        }
      }
    }


    /*
     * tableから削除されたセルなどをcleanup。
     */
    document
      .querySelectorAll(
        '.kame-sheet-formula-cell'
      )
      .forEach(
        element => {

          if (
            element instanceof HTMLElement &&
            !activeFormulaCells.has(
              element
            )
          ) {

            clearFormulaCell(
              element
            );
          }
        }
      );
  }


  /**
   * @returns {void}
   */
  function queueRefresh() {

    if (
      refreshFrame !==
      null
    ) {

      return;
    }


    refreshFrame =
      window.requestAnimationFrame(
        () => {

          refreshFrame =
            null;


          refresh();
        }
      );
  }


  /* =========================================================
     Mutation Filter
     ========================================================= */

  /**
   * 自分で追加した計算結果による
   * DOM変更か判定。
   *
   * @param {MutationRecord} mutation
   * @returns {boolean}
   */
  function isOwnMutation(
    mutation
  ) {

    const target =
      mutation.target;


    if (
      target instanceof Element &&
      target.closest(
        '.kame-sheet-result'
      )
    ) {

      return true;
    }


    if (
      target.parentElement?.closest(
        '.kame-sheet-result'
      )
    ) {

      return true;
    }


    const nodes = [
      ...mutation.addedNodes,
      ...mutation.removedNodes
    ];


    if (
      nodes.length ===
      0
    ) {

      return false;
    }


    return (
      nodes.every(
        node => (
          node instanceof HTMLElement &&
          node.classList.contains(
            'kame-sheet-result'
          )
        )
      )
    );
  }


  /* =========================================================
     Observer
     ========================================================= */

  observer =
    new MutationObserver(
      mutations => {

        const relevant =
          mutations.some(
            mutation => (
              !isOwnMutation(
                mutation
              )
            )
          );


        if (
          relevant
        ) {

          queueRefresh();
        }
      }
    );


  observer.observe(
    document.body,
    {
      childList:
        true,

      subtree:
        true,

      characterData:
        true
    }
  );


  /* =========================================================
     Input
     ========================================================= */

  document.addEventListener(
    'input',

    queueRefresh,

    {
      signal,
      capture:
        true
    }
  );


  /* =========================================================
     Navigation
     ========================================================= */

  window.addEventListener(
    'popstate',

    queueRefresh,

    {
      signal
    }
  );


  window.addEventListener(
    'hashchange',

    queueRefresh,

    {
      signal
    }
  );


  /* =========================================================
     Cleanup
     ========================================================= */

  signal.addEventListener(
    'abort',

    () => {

      observer?.disconnect();


      if (
        refreshFrame !==
        null
      ) {

        window.cancelAnimationFrame(
          refreshFrame
        );


        refreshFrame =
          null;
      }


      document
        .querySelectorAll(
          '.kame-sheet-formula-cell'
        )
        .forEach(
          element => {

            if (
              element instanceof HTMLElement
            ) {

              clearFormulaCell(
                element
              );
            }
          }
        );
    }
  );


  /* =========================================================
     Initial
     ========================================================= */

  refresh();


  window.requestAnimationFrame(
    refresh
  );


  window.setTimeout(
    refresh,
    300
  );


  console.log(
    '[Kame Spreadsheet] loaded'
  );

})();