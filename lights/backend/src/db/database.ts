import { readFile, writeFile } from "fs/promises";
import { DBContents, LightsState, newDb, Template } from "../types";
import ws from "../ws/websockets";

class Database {
  private data: DBContents | undefined;

  constructor(private filepath: string) {
    this.read();
  }

  private async read() {
    try {
      const data = await readFile(this.filepath, "utf8");
      this.data = JSON.parse(data) as DBContents;
      console.log("Database read");
    } catch (error) {
      this.data = newDb();
      console.log("Database created");
    }
  }

  private async write() {
    if (this.data == undefined) return;

    try {
      const jsonString = JSON.stringify(this.data, null, 2);
      await writeFile(this.filepath, jsonString, "utf8");
      console.log("Database write");
    } catch (error) {
      console.error("Database write error:", error);
    }

    ws.sendData(this.data);
  }

  public templateCurrentState(
    name: string,
    replace: boolean,
  ): Template | string {
    if (this.data == undefined) {
      return "Database not loaded";
    }

    const existing = this.data.templates.find((t) => t.name == name);

    if (existing) {
      if (replace) {
        this.data.templates = this.data.templates.filter((t) => t !== existing);
      } else {
        return `Template with name ${name} already exists`;
      }
    }

    const newTemplate: Template = {
      name: name,
      state: { ...this.data.currentState },
    };

    this.data.templates.push(newTemplate);

    this.write();

    return newTemplate;
  }

  public getState(): LightsState | undefined {
    return this.data?.currentState;
  }

  public getTemplates(): Template[] | undefined {
    return this.data?.templates;
  }

  public setState(state: LightsState): LightsState | string {
    if (!this.data) return "Database not loaded";

    this.data.currentState = state;
    this.data.appliedTemplate = undefined;

    this.write();
    return state;
  }

  public getData() {
    return this.data;
  }

  public applyTemplate(name: string): Template | string {
    if (!this.data) return "Database not loaded";

    const template = this.data.templates.find((t) => t.name == name);

    if (template == undefined) {
      return `Template with name ${name} not found`;
    }

    this.data.appliedTemplate = template.name;
    this.data.currentState = { ...template.state };

    this.write();
    return template;
  }

  public deleteTemplate(name: string): Template | string {
    if (!this.data) return "Database not loaded";

    const template = this.data.templates.find((t) => t.name == name);

    if (template == undefined) {
      return `Template with name ${name} not found`;
    }

    this.data.templates = this.data.templates.filter((t) => t !== template);

    this.write();
    return template;
  }
}

const db = new Database("database.json");
export default db;
