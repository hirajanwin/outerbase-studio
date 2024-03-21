import { validateConnectionEndpoint, validateOperation } from "./validation";

describe("Operation Validation", () => {
  it("UPDATE with primary key SHOULD be valid operation", () => {
    const result = validateOperation(
      {
        operation: "UPDATE",
        values: {
          name: "Visal",
        },
        where: {
          id: 5,
        },
      },
      { autoIncrement: false, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(true);
  });

  it("UPDATE without primary key SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "UPDATE",
        values: {
          name: "Visal",
        },
        where: {
          id: 5,
        },
      },
      { autoIncrement: false, columns: [], pk: [""] }
    );

    expect(result.valid).toBe(false);
  });

  it("UPDATE with row NULL as value for primary key SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "UPDATE",
        values: {
          name: "Visal",
        },
        where: {
          id: null,
        },
      },
      { autoIncrement: false, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(false);
  });

  it("UPDATE with NULL as value for any one of primary key SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "UPDATE",
        values: {
          age: "67",
        },
        where: {
          id: 5,
          name: null,
        },
      },
      { autoIncrement: false, columns: [], pk: ["id", "name"] }
    );

    expect(result.valid).toBe(false);
  });

  it("UPDATE primary key to NULL SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "UPDATE",
        values: {
          id: null,
        },
        where: {
          id: 5,
        },
      },
      { autoIncrement: false, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(false);
  });

  it("DELETE row with primary key SHOULD be valid operation", () => {
    const result = validateOperation(
      {
        operation: "DELETE",
        where: {
          id: 5,
        },
      },
      { autoIncrement: false, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(true);
  });

  it("DELETE row without primary key SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "DELETE",
        where: {
          id: 5,
        },
      },
      { autoIncrement: false, columns: [], pk: [] }
    );

    expect(result.valid).toBe(false);
  });

  it("DELETE row with NULL primary key SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "DELETE",
        where: {
          id: null,
        },
      },
      { autoIncrement: false, columns: [], pk: [] }
    );

    expect(result.valid).toBe(false);
  });

  it("INSERT with primary key SHOULD be valid operation", () => {
    const result = validateOperation(
      {
        operation: "INSERT",
        values: {
          id: 5,
          name: "Visal",
        },
      },
      { autoIncrement: false, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(true);
  });

  it("INSERT with primary key with NULL value SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "INSERT",
        values: {
          id: null,
          name: "Visal",
        },
      },
      { autoIncrement: false, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(false);
  });

  it("INSERT with auto increment primary key with NULL value SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "INSERT",
        values: {
          id: null,
          name: "Visal",
        },
      },
      { autoIncrement: true, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(false);
  });

  it("INSERT with one of primary key with NULL value SHOULD NOT be valid operation", () => {
    const result = validateOperation(
      {
        operation: "INSERT",
        values: {
          id: 5,
          name: null,
        },
      },
      { autoIncrement: false, columns: [], pk: ["id", "name"] }
    );

    expect(result.valid).toBe(false);
  });

  it("INSERT with primary key with no value but it is auto increment primary key SHOULD be valid operation", () => {
    const result = validateOperation(
      {
        operation: "INSERT",
        values: {
          name: "Visal",
        },
      },
      { autoIncrement: true, columns: [], pk: ["id"] }
    );

    expect(result.valid).toBe(true);
  });
});

describe("Validate the connection endpoint", () => {
  it("wss:// is valid endpoint", () => {
    expect(validateConnectionEndpoint("wss://testing.example.com")[0]).toBe(
      true
    );
  });

  it("Non wss:// is not valid endpoint", () => {
    expect(validateConnectionEndpoint("https://testing.example.com")[0]).toBe(
      true
    );
  });
});
