// Author: kamekingdom (2026-09-09)

/**
 * @typedef {{
 *   from: string,
 *   to: string
 * }} Replacement
 */


/* =========================================================
   Replacements
   ========================================================= */

/** @type {Replacement[]} */
const replacements = [

  /* =======================================================
     矢印
     ======================================================= */

  { from: "<=>", to: "⇔" },
  { from: "<->", to: "↔" },

  { from: "=>", to: "⇒" },
  { from: "->", to: "→" },
  { from: "<-", to: "←" },


  /* =======================================================
     比較・数学
     ======================================================= */

  { from: ">=", to: "≥" },
  { from: "<=", to: "≤" },
  { from: "!=", to: "≠" },
  { from: "~=", to: "≈" },
  { from: "+-", to: "±" },


  /* =======================================================
     Greek letters
     ======================================================= */

  { from: "::alpha",   to: "α" },
  { from: "::beta",    to: "β" },
  { from: "::gamma",   to: "γ" },
  { from: "::delta",   to: "δ" },
  { from: "::epsilon", to: "ε" },
  { from: "::zeta",    to: "ζ" },
  { from: "::eta",     to: "η" },
  { from: "::theta",   to: "θ" },
  { from: "::iota",    to: "ι" },
  { from: "::kappa",   to: "κ" },
  { from: "::lambda",  to: "λ" },
  { from: "::mu",      to: "μ" },
  { from: "::nu",      to: "ν" },
  { from: "::xi",      to: "ξ" },
  { from: "::omicron", to: "ο" },
  { from: "::pi",      to: "π" },
  { from: "::rho",     to: "ρ" },
  { from: "::sigma",   to: "σ" },
  { from: "::tau",     to: "τ" },
  { from: "::upsilon", to: "υ" },
  { from: "::phi",     to: "φ" },
  { from: "::chi",     to: "χ" },
  { from: "::psi",     to: "ψ" },
  { from: "::omega",   to: "ω" },


  /* =======================================================
     数学記号
     ======================================================= */

  { from: "::inf",     to: "[$ \\infty]" },
  { from: "::sqrt",    to: "[$ \\sqrt{}]" },
  { from: "::sum",     to: "[$ \\sum]" },
  { from: "::prod",    to: "[$ \\prod]" },
  { from: "::neq",     to: "[$ \\neq]" },
  { from: "::approx",  to: "[$ \\approx]" },
  { from: "::le",      to: "[$ \\leq]" },
  { from: "::ge",      to: "[$ \\geq]" },
  { from: "::pm",      to: "[$ \\pm]" },
  { from: "::times",   to: "[$ \\times]" },
  { from: "::partial", to: "[$ \\partial]" },
  { from: "::nabla",   to: "[$ \\nabla]" },
  { from: "::forall",  to: "[$ \\forall]" },
  { from: "::exists",  to: "[$ \\exists]" },
  { from: "::in",      to: "[$ \\in]" },
  { from: "::notin",   to: "[$ \\notin]" },


  /* =======================================================
     1文字ショートカット
     ======================================================= */

  { from: "::a", to: "[$ a]" },
  { from: "::b", to: "[$ b]" },
  { from: "::c", to: "[$ c]" },
  { from: "::d", to: "[$ d]" },
  { from: "::e", to: "[$ e]" },
  { from: "::f", to: "[$ f]" },
  { from: "::g", to: "[$ g]" },
  { from: "::h", to: "[$ h]" },
  { from: "::i", to: "[$ i]" },
  { from: "::j", to: "[$ j]" },
  { from: "::k", to: "[$ k]" },
  { from: "::l", to: "[$ l]" },
  { from: "::m", to: "[$ m]" },
  { from: "::n", to: "[$ n]" },
  { from: "::o", to: "[$ o]" },
  { from: "::p", to: "[$ p]" },
  { from: "::q", to: "[$ q]" },
  { from: "::r", to: "[$ r]" },
  { from: "::s", to: "[$ s]" },
  { from: "::t", to: "[$ t]" },
  { from: "::u", to: "[$ u]" },
  { from: "::v", to: "[$ v]" },
  { from: "::w", to: "[$ w]" },
  { from: "::x", to: "[$ x]" },
  { from: "::y", to: "[$ y]" },
  { from: "::z", to: "[$ z]" },


  /* =======================================================
     大文字
     ======================================================= */

  { from: "::A", to: "[$ A]" },
  { from: "::B", to: "[$ B]" },
  { from: "::C", to: "[$ C]" },
  { from: "::D", to: "[$ D]" },
  { from: "::E", to: "[$ E]" },
  { from: "::F", to: "[$ F]" },
  { from: "::G", to: "[$ G]" },
  { from: "::H", to: "[$ H]" },
  { from: "::I", to: "[$ I]" },
  { from: "::J", to: "[$ J]" },
  { from: "::K", to: "[$ K]" },
  { from: "::L", to: "[$ L]" },
  { from: "::M", to: "[$ M]" },
  { from: "::N", to: "[$ N]" },
  { from: "::O", to: "[$ O]" },
  { from: "::P", to: "[$ P]" },
  { from: "::Q", to: "[$ Q]" },
  { from: "::R", to: "[$ R]" },
  { from: "::S", to: "[$ S]" },
  { from: "::T", to: "[$ T]" },
  { from: "::U", to: "[$ U]" },
  { from: "::V", to: "[$ V]" },
  { from: "::W", to: "[$ W]" },
  { from: "::X", to: "[$ X]" },
  { from: "::Y", to: "[$ Y]" },
  { from: "::Z", to: "[$ Z]" },
];


/* =========================================================
   Sorted Replacements
   ========================================================= */

/*
 * 毎keydownでsortしない。
 *
 * 長いパターンを常に優先する。
 */

/** @type {Replacement[]} */
const sortedReplacements =
  [...replacements].sort(
    (
      /** @type {Replacement} */ a,
      /** @type {Replacement} */ b
    ) =>
      b.from.length -
      a.from.length
  );


/* =========================================================
   State
   ========================================================= */

/** @type {string} */
let typed =
  "";


/* =========================================================
   Utility
   ========================================================= */

/**
 * textの末尾に完全一致するReplacementを取得。
 *
 * 長いReplacementから検索するため、
 * 最長一致になる。
 *
 * @param {string} text
 * @returns {Replacement | null}
 */
function findExactReplacement(
  text
) {

  for (
    const replacement
    of sortedReplacements
  ) {

    if (
      text.endsWith(
        replacement.from
      )
    ) {

      return replacement;
    }
  }


  return null;
}


/**
 * patternの続きとして
 * より長いReplacementが存在するか。
 *
 * 例:
 *
 * "<-"
 *   ↓
 * "<->" が存在
 *
 * "::a"
 *   ↓
 * "::alpha" / "::approx" が存在
 *
 * @param {string} pattern
 * @returns {boolean}
 */
function hasLongerReplacement(
  pattern
) {

  return replacements.some(
    (
      /** @type {Replacement} */ replacement
    ) => {

      return (
        replacement.from.length >
          pattern.length &&
        replacement.from.startsWith(
          pattern
        )
      );
    }
  );
}


/**
 * text自体が、
 * 何らかのReplacementの入力途中か。
 *
 * @param {string} text
 * @returns {boolean}
 */
function isReplacementPrefix(
  text
) {

  return replacements.some(
    (
      /** @type {Replacement} */ replacement
    ) =>
      replacement.from.startsWith(
        text
      )
  );
}


/**
 * BackspaceをScrapboxへ送る。
 *
 * @param {HTMLTextAreaElement} input
 * @param {number} count
 * @returns {void}
 */
function dispatchBackspaces(
  input,
  count
) {

  for (
    let index = 0;
    index < count;
    index++
  ) {

    input.dispatchEvent(
      new KeyboardEvent(
        "keydown",
        {
          key: "Backspace",
          code: "Backspace",
          keyCode: 8,
          which: 8,
          bubbles: true,
          cancelable: true,
        }
      )
    );


    input.dispatchEvent(
      new KeyboardEvent(
        "keyup",
        {
          key: "Backspace",
          code: "Backspace",
          keyCode: 8,
          which: 8,
          bubbles: true,
          cancelable: true,
        }
      )
    );
  }
}


/**
 * Replacementを実際に適用。
 *
 * 最後の文字はまだ入力されていないので、
 * from.length - 1文字だけ削除する。
 *
 * @param {KeyboardEvent} event
 * @param {HTMLTextAreaElement} input
 * @param {Replacement} replacement
 * @returns {void}
 */
function applyReplacement(
  event,
  input,
  replacement
) {

  event.preventDefault();

  event.stopPropagation();

  event.stopImmediatePropagation();


  /** @type {number} */
  const deleteCount =
    replacement.from.length -
    1;


  dispatchBackspaces(
    input,
    deleteCount
  );


  document.execCommand(
    "insertText",
    false,
    replacement.to
  );


  typed =
    "";
}


/**
 * すでに入力済みの保留Replacementを確定し、
 * 今回入力された文字も同時に挿入する。
 *
 * 例:
 *
 * "<-" まで入力
 * ↓
 * Space
 * ↓
 * "← "
 *
 * @param {KeyboardEvent} event
 * @param {HTMLTextAreaElement} input
 * @param {Replacement} replacement
 * @returns {void}
 */
function commitPendingReplacement(
  event,
  input,
  replacement
) {

  event.preventDefault();

  event.stopPropagation();

  event.stopImmediatePropagation();


  /*
   * pending patternは全文字が
   * すでに入力済み。
   */
  dispatchBackspaces(
    input,
    replacement.from.length
  );


  document.execCommand(
    "insertText",
    false,
    replacement.to +
      event.key
  );


  typed =
    "";
}


/* =========================================================
   Keydown
   ========================================================= */

document.addEventListener(
  "keydown",

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  function (
    event
  ) {

    /* =======================================================
       IME
       ======================================================= */

    if (
      event.isComposing ||
      event.key ===
        "Process"
    ) {

      return;
    }


    /* =======================================================
       Modifier
       ======================================================= */

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {

      typed =
        "";

      return;
    }


    /* =======================================================
       Input
       ======================================================= */

    /** @type {HTMLTextAreaElement | null} */
    const input =
      document.querySelector(
        "#text-input"
      );


    if (
      !input
    ) {

      return;
    }


    if (
      document.activeElement !==
      input
    ) {

      typed =
        "";

      return;
    }


    /* =======================================================
       Printable Character
       ======================================================= */

    if (
      event.key.length ===
      1
    ) {

      /** @type {string} */
      const candidate =
        typed +
        event.key;


      /* -----------------------------------------------------
         完全一致
         ----------------------------------------------------- */

      /** @type {Replacement | null} */
      const exactReplacement =
        findExactReplacement(
          candidate
        );


      if (
        exactReplacement
      ) {

        /*
         * ここが今回の重要部分。
         *
         * より長いパターンが存在する場合は、
         * 今は変換しない。
         *
         * 例:
         *
         * "<-"
         *   ↓ defer
         *
         * 次に ">" が来れば
         * "<->" → "↔"
         */
        if (
          hasLongerReplacement(
            exactReplacement.from
          )
        ) {

          typed =
            candidate.slice(
              -20
            );


          return;
        }


        applyReplacement(
          event,
          input,
          exactReplacement
        );


        return;
      }


      /* -----------------------------------------------------
         入力途中
         ----------------------------------------------------- */

      /*
       * candidateそのものが
       * 長いReplacementのprefixなら、
       * そのまま次のキーを待つ。
       *
       * 例:
       *
       * "::al"
       * ↓
       * "::alpha"の途中
       */
      if (
        isReplacementPrefix(
          candidate
        )
      ) {

        typed =
          candidate.slice(
            -20
          );


        return;
      }


      /* -----------------------------------------------------
         保留していた短いReplacementを確定
         ----------------------------------------------------- */

      /*
       * 例:
       *
       * "::a" を入力済み
       * ↓
       * Space
       *
       * "::alpha"には進まないので、
       *
       * "::a" → "[$ a]"
       *
       * をここで確定する。
       */

      /** @type {Replacement | null} */
      const pendingReplacement =
        findExactReplacement(
          typed
        );


      if (
        pendingReplacement
      ) {

        commitPendingReplacement(
          event,
          input,
          pendingReplacement
        );


        return;
      }


      /* -----------------------------------------------------
         通常文字
         ----------------------------------------------------- */

      typed =
        candidate.slice(
          -20
        );


      return;
    }


    /* =======================================================
       Special Keys
       ======================================================= */

    if (
      [
        "Enter",
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Escape",
        "Tab",
      ].includes(
        event.key
      )
    ) {

      typed =
        "";
    }
  },

  true
);


console.log(
  "[AutoReplace] loaded"
);