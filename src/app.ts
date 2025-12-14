import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cookieParser from "cookie-parser";
import path from "path";
import bodyParser from "body-parser";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app: Application = express();

// app.set("trust proxy", true);

// const allowedOrigins = [
//   "https://fasifys.com",
//   "https://www.fasifys.com",
//   "https://dashboard.fasifys.com",
//   "http://localhost:5173",
//   "http://localhost:5174",
//   "http://localhost:3000",
//   "https://api.country.is",
//   "https://open.er-api.com/v6/latest/USD",
//   "https://www.google.com/maps",
// ];

// const corsOptions = {
//   origin: function (origin: any, callback: any) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true); // Origin match → allow
//     } else {
//       callback(new Error("CORS policy: Origin not allowed"));
//     }
//   },
//   credentials: true,
//   allowedHeaders: [
//     "Content-Type",
//     "Authorization",
//     // "X-User-IP",
//     // "X-User-Currency",
//   ],
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
// };

app.use(
  bodyParser.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// app.use(cors(corsOptions));
// // Handle preflight requests for all routes
// // app.options("*", cors(corsOptions));

// app.use(cookieParser());

// app.use(express.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "How's Project API" });
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/v1", router);

app.use(GlobalErrorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
