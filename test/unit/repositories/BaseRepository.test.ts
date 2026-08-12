import { dbClient, Db } from "@/config/db";
import { BaseRepository } from "@/repositories/BaseRepository";

interface Row {
  id: string;
  name?: string;
}

describe("BaseRepository", () => {
  const makeFakeDb = (): Db =>
    ({
      query: jest.fn(async () => ({ rows: [], rowCount: 1 })),
    }) as unknown as Db;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("queries the global pool when no db is passed (backward compatibility)", async () => {
    const poolQuery = (jest.spyOn(dbClient, "query") as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: "1", name: "acme" }],
      rowCount: 1,
    });

    const repo = new BaseRepository<Row>("companies");
    const created = await repo.create({ name: "acme" });
    const updated = await repo.update("1", { name: "acme2" });
    const found = await repo.findById("1");

    expect(created).toEqual({ id: "1", name: "acme" });
    expect(updated).toEqual({ id: "1", name: "acme" });
    expect(found).toEqual({ id: "1", name: "acme" });
    expect(poolQuery).toHaveBeenCalledTimes(3);
  });

  test("mutation methods run on the passed db (pool or transaction client)", async () => {
    const fakeDb = makeFakeDb();
    const repo = new BaseRepository<Row>("companies");

    await repo.create({ name: "acme" }, fakeDb);
    await repo.update("1", { name: "acme2" }, fakeDb);
    await repo.delete("1", fakeDb);
    await repo.deleteByField("name", "acme", fakeDb);
    await repo.deleteAllbyField("name", "acme", fakeDb);

    expect(fakeDb.query).toHaveBeenCalledTimes(5);
  });

  test("reads used by transaction flows run on the passed db", async () => {
    const fakeDb = makeFakeDb();
    const repo = new BaseRepository<Row>("companies");

    await repo.findById("1", fakeDb);
    await repo.findByField("reference_id", "pref-1", fakeDb);
    await repo.findWithCondition("id = $1", ["1"], fakeDb);
    await repo.findOneWithConditions(["id = $1"], ["1"], fakeDb);
    await repo.findManyByField("name", "acme", fakeDb);
    await repo.existsById("1", fakeDb);
    await repo.existsByField("name", "acme", fakeDb);
    await repo.findAll(fakeDb);
    await repo.findByCompanyId("c-1", fakeDb);

    expect(fakeDb.query).toHaveBeenCalledTimes(9);
  });
});