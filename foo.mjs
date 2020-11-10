import assert from "assert";
/* [x] + / -
 * [ ] decimal
 * [ ] lists cons etc
 * [ ] lambdas
 * [ ] conditionals
 * [ ] strings
 * [ ] literal
 * [ ] good errors \w line-numbers
 * [ ] good repl
 */
function parse(code) {
  const program = [];
  const stack = [];
  let current = program;
  let isSymbol = false;
  let symbol = "";

  for (let i of code) {
    switch (i) {
      case "(": {
        current = [];
        stack.push(current);
        if (stack.length === 1) {
          program.push(current);
        } else {
          stack[stack.length - 2].push(current);
        }
        break;
      }
      case "+": {
        current.push("+");
        break;
      }
      case "-": {
        current.push("-");
        break;
      }
      case " ":
      case "\n":
      case "\n\r" /* TODO: actually handle this case*/: {
        if (isSymbol) {
          current.push(symbol);
          symbol = "";
          isSymbol = false;
        }
        break;
      }
      case ")": {
        if (isSymbol) {
          current.push(symbol);
          symbol = "";
          isSymbol = false;
        }
        stack.pop();
        current = stack[stack.length - 1];
        break;
      }
      default: {
        if (/\d/.test(i)) {
          current.push(Number(i));
        } else if (/\w/.test(i)) {
          isSymbol = true;
          symbol += i;
        } else {
          throw new Error(`NoSuchSyntax: '${i}'`);
        }
      }
    }
  }

  return program;
}

// TODO: test
function assertPrimitive(maybePrimitive, name) {
  if (typeof maybePrimitive === "number") {
    return maybePrimitive;
  } else {
    throw new Error(`Unbound: '${name}'`);
  }
}

// TODO: test
function assertSymbol(maybeSymbol) {
  if (typeof maybeSymbol === "string" && /^\w+[\d\w]*?$/.test(maybeSymbol)) {
    return maybeSymbol;
  } else {
    throw new Error(`Unbound: '${maybeSymbol}'`);
  }
}

const core = {
  __proto__: null,
  define: (operands, environment, exec) => {
    if (operands.length < 1 && operands.length > 2) {
      throw new Error(`define must take 1 or 2 arguments`);
    }

    const name = operands.shift();
    if (typeof name === "string") {
      const operand = operands.shift();
      if (typeof operand === "number") {
        environment[name] = operand;
      } else if (Array.isArray(operand)) {
        environment[name] = assertPrimitive(
          exec(operand, environment, exec),
          operand
        );
      } else {
        environment[name] = assertPrimitive(environment[operand], operand);
      }
    } else {
      throw new Error("Not Implemented");
    }
  },

  "+": (operands, environment, exec) => {
    let result = 0;
    for (let operand of operands) {
      if (typeof operand === "number") {
        result += operand;
      } else if (typeof operand === "string") {
        result += assertPrimitive(environment[operand]);
      } else if (Array.isArray(operand)) {
        result += assertPrimitive(exec(operand, environment, exec));
      } else {
        throw new Error(`operation + not implemented for ${operand}`);
      }
    }
    return result;
  },

  "-": (operands, environment, exec) => {
    if (operands.length < 1) {
      throw new Error(`Too few arguments, expected at-least 1 but got [0]`);
    }
    let result = operands.shift();
    if (typeof result === "number") {
      result = result;
    } else if (typeof result === "string") {
      result = assertPrimitive(environment[result]);
    } else if (Array.isArray(result)) {
      result = assertPrimitive(exec(result, environment, exec));
    } else {
      throw new Error(`operation - not implemented for ${result}`);
    }

    if (operands.length === 0) {
      return -result;
    }

    for (let operand of operands) {
      if (typeof operand === "number") {
        result -= operand;
      } else if (typeof operand === "string") {
        result -= assertPrimitive(environment[operand]);
      } else if (Array.isArray(operand)) {
        result -= assertPrimitive(exec(operand, environment, exec));
      } else {
        throw new Error(`operation - not implemented for ${operand}`);
      }
    }
    return result;
  },
};

function execTopLevel(program, inheritedEnvironment = Object.create(core)) {
  let result;
  if (program.length === 0) {
    return result;
  }

  for (const op of program) {
    if (typeof op === "number") {
      result = op;
    } else if (Array.isArray(op)) {
      result = exec(op, inheritedEnvironment);
    } else if (typeof inheritedEnvironment[op] === "function") {
      result = inheritedEnvironment[op](program, inheritedEnvironment, exec);
    } else {
      result = assertPrimitive(inheritedEnvironment[op], op);
    }
  }

  return result;
}

function exec(program, inheritedEnvironment = Object.create(core)) {
  let result = [];
  if (program.length === 0) {
    return result;
  }

  const op = program.shift();

  if (typeof op === "number") {
    result.push(op);
    return result;
  } else if (Array.isArray(op)) {
    result.push(exec(op, inheritedEnvironment));
  } else if (typeof inheritedEnvironment[op] === "function") {
    return inheritedEnvironment[op](program, inheritedEnvironment, exec);
  } else {
    result = assertPrimitive(inheritedEnvironment[op], op);
  }

  return result;
}

function run(code) {
  return execTopLevel(parse(code));
}

// assert.deepEqual(parse(`3.14`), [3.14]); // TODO
assert.deepEqual(parse(`1`), [1]);
assert.deepEqual(parse(`()`), [[]]);
assert.deepEqual(parse(`(+ 1 2)`), [["+", 1, 2]]);
assert.deepEqual(parse(`(+ (+ 1) 2)`), [["+", ["+", 1], 2]]);
assert.deepEqual(parse(`(+ 2 2)(+ 1 2)`), [
  ["+", 2, 2],
  ["+", 1, 2],
]);

assert.deepEqual(parse(`(define one 1)`), [["define", "one", 1]]);
assert.deepEqual(
  parse(`
  (define one 1)
  (define two 2)
`),
  [
    ["define", "one", 1],
    ["define", "two", 2],
  ]
);

assert.deepEqual(exec([]), []); //
assert.deepEqual(exec([1]), [1]);
assert.deepEqual(exec(["+", 1]), 1);
assert.deepEqual(exec(["-", 1]), -1);
assert.deepEqual(exec([["+", 1, 2, 3]]), [6]);
assert.deepEqual(exec([[]]), [[]]);
assert.deepEqual(exec([["-", 1, 2, 3]]), [-4]);
assert.deepEqual(exec([["+", ["+", 1], 2, 3]]), [6]);
assert.deepEqual(exec([["-", ["-", 1], 2, 3]]), [-6]);
assert.deepEqual(exec([["+", ["+", 1, 2, 3], 2, 3]]), [11]);

assert.deepEqual(run(`()`), []);
assert.deepEqual(run(`(+)`), 0);
assert.throws(
  () => run(`(-)`),
  /Too few arguments, expected at-least 1 but got \[0\]/
);
assert.deepEqual(run(`(+ 1)`), 1);
assert.deepEqual(run(`(- 1)`), -1);
assert.deepEqual(run(`(+ 1 2)`), 3);
assert.deepEqual(run(`(- 1 2)`), -1); // TODO: make work
assert.deepEqual(run(`(+ 1 (+ 2))`), 3);
assert.deepEqual(run(`(+ 1 (+ 2 2))`), 5);
assert.deepEqual(run(`(+ 1 2)(+ 1 (+ 2 2))(- 1)`), -1);

assert.deepEqual(
  run(`
(+ 1 2)
(+ 1 (+ 2 2))
(- 1)
`),
  -1
);

assert.deepEqual(run("(define one 1)"), undefined);
assert.deepEqual(run("(define one (+ 1 1))(one)"), 2);

assert.deepEqual(run("(define one 1)(+ one one)"), 2);
assert.deepEqual(
  run(`
(define one 1)
(define two 2)
(define complex (+ one one))
(+ one one)
(+ one two)
`),
  3
);

assert.throws(() => run(`(apple)`), /Unbound: 'apple'/);
assert.throws(() => run(`(define orange apple)`), /Unbound: 'apple'/);
