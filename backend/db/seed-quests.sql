-- Seed data for Quests
-- Crafting Interpreters Quest

-- Insert the main quest
INSERT INTO quests (name, description, total_xp_reward)
VALUES (
  'Crafting Interpreters',
  'Build two complete interpreters for a full-featured language. Learn how languages work from the ground up by implementing Lox, a language we''ll design and build together.',
  10000
)
ON CONFLICT DO NOTHING;

-- Get the quest ID (assuming it's the first quest)
DO $$
DECLARE
  quest_id_var INTEGER;
BEGIN
  SELECT id INTO quest_id_var FROM quests WHERE name = 'Crafting Interpreters' LIMIT 1;

  -- Part 1: Introduction and Fundamentals
  INSERT INTO quest_steps (quest_id, step_order, name, description, xp_reward) VALUES
  (quest_id_var, 1, 'Introduction', 'Read the introduction and understand why learning interpreters matters. Complete the challenges at the end of the chapter.', 100),
  (quest_id_var, 2, 'A Map of the Territory', 'Learn the landscape of language implementation: interpreters vs compilers, parsing, and the phases of a language implementation.', 150),
  (quest_id_var, 3, 'The Lox Language', 'Understand the language we''ll be building. Learn about Lox''s syntax, semantics, and design philosophy.', 200);

  -- Part 2: jlox - Tree-walk Interpreter (Java)
  INSERT INTO quest_steps (quest_id, step_order, name, description, xp_reward) VALUES
  (quest_id_var, 4, 'Scanning', 'Build the lexer (scanner) that converts source code into tokens. Implement token types and handle whitespace, comments, and literals.', 300),
  (quest_id_var, 5, 'Representing Code', 'Design the AST (Abstract Syntax Tree) structure. Learn how to represent different language constructs as data structures.', 300),
  (quest_id_var, 6, 'Parsing Expressions', 'Implement a recursive descent parser for expressions. Handle operator precedence and associativity.', 400),
  (quest_id_var, 7, 'Evaluating Expressions', 'Build the expression evaluator. Implement arithmetic, comparison, and logical operations.', 400),
  (quest_id_var, 8, 'Statements and State', 'Add statements and variables. Implement variable declaration, assignment, and scoping.', 500),
  (quest_id_var, 9, 'Control Flow', 'Implement control flow: if/else statements, while loops, and for loops.', 500),
  (quest_id_var, 10, 'Functions', 'Add function declarations and calls. Implement parameter passing and return values.', 600),
  (quest_id_var, 11, 'Resolving and Binding', 'Implement variable resolution. Handle scope correctly and catch variable usage errors.', 600),
  (quest_id_var, 12, 'Classes', 'Add classes, instances, and methods. Implement inheritance and method resolution.', 700),
  (quest_id_var, 13, 'Inheritance', 'Complete the class system with proper inheritance and super keyword support.', 700);

  -- Part 3: clox - Bytecode Virtual Machine (C)
  INSERT INTO quest_steps (quest_id, step_order, name, description, xp_reward) VALUES
  (quest_id_var, 14, 'Chunks of Bytecode', 'Design the bytecode format. Implement the chunk data structure and instruction set.', 500),
  (quest_id_var, 15, 'A Virtual Machine', 'Build the VM that executes bytecode. Implement the instruction dispatch loop.', 600),
  (quest_id_var, 16, 'Scanning on Demand', 'Port the scanner to C. Handle memory management and error reporting.', 400),
  (quest_id_var, 17, 'Compiling Expressions', 'Write the compiler that generates bytecode from source. Compile expressions to bytecode instructions.', 700),
  (quest_id_var, 18, 'Types of Values', 'Implement the value representation. Handle different data types in the VM.', 500),
  (quest_id_var, 19, 'Strings', 'Add string support. Implement string interning and concatenation.', 600),
  (quest_id_var, 20, 'Hash Tables', 'Build a hash table from scratch. Use it for variable storage and string interning.', 700),
  (quest_id_var, 21, 'Global Variables', 'Implement global variable storage and access. Handle variable declaration and assignment.', 500),
  (quest_id_var, 22, 'Local Variables', 'Add local variable support. Implement proper scoping in the bytecode VM.', 600),
  (quest_id_var, 23, 'Jumping Back and Forth', 'Implement control flow with jumps. Add if/else and while loops using jump instructions.', 600),
  (quest_id_var, 24, 'Calls and Functions', 'Add function calls to the VM. Implement call frames and the call stack.', 700),
  (quest_id_var, 25, 'Closures', 'Implement closures. Handle upvalues and proper variable capture.', 800),
  (quest_id_var, 26, 'Garbage Collection', 'Build a garbage collector. Implement mark-and-sweep collection for memory management.', 900),
  (quest_id_var, 27, 'Classes and Instances', 'Add classes and instances to clox. Implement method calls and property access.', 800),
  (quest_id_var, 28, 'Superclasses and Inheritance', 'Complete the class system with inheritance. Implement super keyword and method resolution.', 800),
  (quest_id_var, 29, 'Optimization', 'Optimize the VM. Implement performance improvements and benchmarking.', 600);

  -- Final step
  INSERT INTO quest_steps (quest_id, step_order, name, description, xp_reward) VALUES
  (quest_id_var, 30, 'Quest Complete!', 'You''ve completed the Crafting Interpreters journey! You now understand how programming languages work from the ground up.', 1000);

END $$;

