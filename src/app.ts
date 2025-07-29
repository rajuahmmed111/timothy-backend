import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cors from "cors";
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

export const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(
  bodyParser.json({
    verify: function (
      req: express.Request,
      res: express.Response,
      buf: Buffer
    ) {
      req.rawBody = buf;
    },
  })
);

app.use(bodyParser.json());

// Middleware setup
app.use(cors(corsOptions));
app.use(cookieParser());

app.use(express.json());
// app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Route handler for the root endpoint
app.get("/", (req: Request, res: Response) => {
  res.send({
    message: "How's Project API",
  });
});

// app.use("/uploads", express.static(path.join("/var/www/uploads")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); // Serve static files from the "uploads" directory

// Setup API routes
app.use("/api/v1", router);

// Error handling middleware
app.use(GlobalErrorHandler);

// 404 Not Found handler
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

// import express, { Application, NextFunction, Request, Response } from "express";
// import httpStatus from "http-status";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import path from "path";
// import bodyParser from "body-parser";
// import router from "./app/routes";
// import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
// import { handleStripeWebhook } from "./app/modules/subscriptions/subscriptions.controller";

// const app: Application = express();

// // CORS config
// export const corsOptions = {
//   origin: ["http://localhost:3000", "http://localhost:3001"],
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// };

// // 👉 Webhook route - must be defined BEFORE express.json()
// app.post(
//   "/webhooks",
//   express.raw({ type: "application/json" }), // must use raw body
//   handleStripeWebhook
// );

// // ✅ Middleware setup
// app.use(cors(corsOptions));
// app.use(cookieParser());
// app.use(express.json()); // only used after webhook
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));

// // ✅ Root route
// app.get("/", (req: Request, res: Response) => {
//   res.send({
//     message: "How's Project API",
//   });
// });

// // ✅ Static uploads
// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// // ✅ API routes
// app.use("/api/v1", router);

// // ✅ Global error handler
// app.use(GlobalErrorHandler);

// // ✅ 404 Handler
// app.use((req: Request, res: Response, next: NextFunction) => {
//   res.status(httpStatus.NOT_FOUND).json({
//     success: false,
//     message: "API NOT FOUND!",
//     error: {
//       path: req.originalUrl,
//       message: "Your requested path is not found!",
//     },
//   });
// });

// export default app;
