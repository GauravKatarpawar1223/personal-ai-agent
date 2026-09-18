/**
 * Minimal, safe arithmetic evaluator for the calculator tool. Never uses
 * eval() or `new Function()` on user input — this is a hand-written
 * recursive-descent parser supporting +, -, *, /, parentheses, decimals,
 * and unary minus. Throws a plain Error with a user-safe message on any
 * invalid input.
 */
export function evaluateExpression(expression: string): number {
  const tokens = tokenize(expression);
  let pos = 0;

  function peek() {
    return tokens[pos];
  }
  function next() {
    return tokens[pos++];
  }

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = next();
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = next();
      const rhs = parseFactor();
      if (op === "/" && rhs === 0) throw new Error("Division by zero.");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseFactor(): number {
    if (peek() === "-") {
      next();
      return -parseFactor();
    }
    if (peek() === "(") {
      next();
      const value = parseExpression();
      if (next() !== ")") throw new Error("Mismatched parentheses.");
      return value;
    }
    const token = next();
    const value = Number(token);
    if (token === undefined || Number.isNaN(value)) {
      throw new Error("I couldn't read that expression.");
    }
    return value;
  }

  if (tokens.length === 0) throw new Error("No expression given.");
  const result = parseExpression();
  if (pos !== tokens.length) throw new Error("I couldn't read that expression.");
  if (!Number.isFinite(result)) throw new Error("That expression didn't produce a valid number.");
  return result;
}

function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  const re = /\d+(?:\.\d+)?|[+\-*/()]/g;
  let match: RegExpExecArray | null;
  let consumedLength = 0;
  while ((match = re.exec(expression)) !== null) {
    tokens.push(match[0]);
    consumedLength += match[0].length;
  }
  // Reject input containing characters outside numbers/operators/whitespace
  // (e.g. letters) rather than silently ignoring them.
  const stripped = expression.replace(/\s+/g, "");
  if (stripped.length !== tokens.join("").length) {
    throw new Error("I couldn't read that expression.");
  }
  return tokens;
}
