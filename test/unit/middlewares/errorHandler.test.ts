import { ConflictError, DatabaseError, ForbiddenError, NotFoundError } from "@/errors/httpErrors";
import { errorHandler } from "@/middlewares/errorHandler";

function buildRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, headersSent: false } as any;
  return { json, status, res };
}

const req = { url: "/api/test", method: "GET", ip: "127.0.0.1", headers: {} } as any;

describe("errorHandler", () => {
  it("returns 409 with code for a ConflictError carrying a code", () => {
    const { json, status, res } = buildRes();
    const error = new ConflictError("Los datos enviados ya existen.", {
      code: "UNIQUE_VIOLATION",
    });

    errorHandler(error, req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe("Los datos enviados ya existen.");
    expect(body.code).toBe("UNIQUE_VIOLATION");
  });

  it("returns 503 with code for a DatabaseError carrying a code", () => {
    const { json, status, res } = buildRes();
    const error = new DatabaseError("Servicio de base de datos no disponible.", {
      code: "QUERY_FAILED",
    });

    errorHandler(error, req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(503);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe("Servicio de base de datos no disponible.");
    expect(body.code).toBe("QUERY_FAILED");
  });

  it("returns 404 without a code field when the error carries none", () => {
    const { json, status, res } = buildRes();

    errorHandler(new NotFoundError(), req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe("Recurso no encontrado");
    expect(body).not.toHaveProperty("code");
  });

  it("returns 403 for a ForbiddenError", () => {
    const { status, res } = buildRes();

    errorHandler(new ForbiddenError(), req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(403);
  });

  it("hides unexpected Error messages from the response but logs them", () => {
    const spy = jest.spyOn(console, "error");
    const { json, status, res } = buildRes();
    const error = new Error("connect ECONNREFUSED 127.0.0.1:5432");

    errorHandler(error, req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe("Internal Server Error");
    expect(body.error.message).toBe("Internal Server Error");
    expect(body).not.toHaveProperty("details");
    expect(body).not.toHaveProperty("stack");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");

    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).toContain("ECONNREFUSED");

    spy.mockRestore();
  });

  it("returns a generic 500 for non-Error thrown values without leaking them", () => {
    const { json, status, res } = buildRes();

    errorHandler("connection lost", req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe("Internal Server Error");
    expect(JSON.stringify(body)).not.toContain("connection lost");
  });
});
