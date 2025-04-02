import { rspack, type RspackOptions } from "@rspack/core";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)).toString(),
);

console.log(process.env.NODE_ENV);

const config: RspackOptions = {
  entry: {
    popup: "./src/popup.tsx",
    login: "./src/login.tsx",
    blocked: "./src/blocked.tsx",
    background: "./src/background.ts",
    signup: "./src/signup.tsx",
    onboarding: "./src/onboarding.tsx",
    dashboard: "./src/dashboard.tsx",
    content: "./src/content.tsx",
    education: "./src/education.tsx",
    lecture: "./src/lecture.tsx",
    quiz: "./src/quiz.tsx",
  },
  devtool: process.env.NODE_ENV === "production" ? false : "inline-source-map",
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "js/[name].js",
  },
  plugins: [
    new rspack.DefinePlugin({
      BASE_URL:
        process.env.NODE_ENV === "production"
          ? "'http://localhost:3000'"
          : "'http://localhost:3000'",
      VERSION: JSON.stringify(packageJson.version),
      PRODUCTION: process.env.NODE_ENV === "production",
    }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: "_locales", to: "_locales" }, "manifest.json"],
    }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: "src/pages", to: "pages" }],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx|ts?$/,
        loader: "builtin:swc-loader",
      },
      {
        test: /\.(png|jpg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
};

export default config;
