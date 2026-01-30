/**
 * 统一日志模块
 * 输出到控制台和 logs/ 目录的日志文件
 */
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "app.log");

/** 日志级别 */
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatMessage(level: LogLevel, module: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] [${module}] ${message}`;
}

function writeLog(formatted: string): void {
  try {
    ensureLogDir();
    appendFileSync(LOG_FILE, formatted + "\n");
  } catch {
    // 静默失败，不影响主流程
  }
}

/** 创建一个带模块名前缀的 Logger */
export function createLogger(module: string) {
  return {
    info(msg: string): void {
      const formatted = formatMessage("INFO", module, msg);
      console.log(formatted);
      writeLog(formatted);
    },
    warn(msg: string): void {
      const formatted = formatMessage("WARN", module, msg);
      console.warn(formatted);
      writeLog(formatted);
    },
    error(msg: string): void {
      const formatted = formatMessage("ERROR", module, msg);
      console.error(formatted);
      writeLog(formatted);
    },
    debug(msg: string): void {
      const formatted = formatMessage("DEBUG", module, msg);
      if (process.env.DEBUG) {
        console.debug(formatted);
      }
      writeLog(formatted);
    },
  };
}
