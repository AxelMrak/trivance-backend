import app from "@/app";
import { config } from "@config/constants";

const PORT = config.PORT;

app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on("error", (error) => {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  });
