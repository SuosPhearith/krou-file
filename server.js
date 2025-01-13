const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
fs.ensureDirSync(uploadDir);

// ✅ Predefined list of valid keys
const VALID_KEYS = ["your_secure_key_1", "your_secure_key_2"];

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(uploadDir));

app.post("/upload-chunk", multer().single("chunk"), async (req, res) => {
  const { chunkIndex, totalChunks, fileName, userId, key } = req.body;

  // 🔐 Validate the key
  if (!VALID_KEYS.includes(key)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid key",
    });
  }

  // ✅ Create a user-specific directory for the file chunks
  const tempDir = path.join(uploadDir, `${userId}_${fileName}_chunks`);
  await fs.ensureDir(tempDir);

  // ✅ Write the chunk to a temporary file
  const chunkPath = path.join(tempDir, `${chunkIndex}`);
  await fs.writeFile(chunkPath, req.file.buffer);

  // ✅ Check if all chunks are uploaded
  const files = await fs.readdir(tempDir);
  if (files.length === Number(totalChunks)) {
    // ✅ Merge all chunks
    const fileBuffer = await Promise.all(
      files
        .sort((a, b) => Number(a) - Number(b))
        .map((chunkFile) => fs.readFile(path.join(tempDir, chunkFile)))
    );

    // ✅ Generate a timestamp
    const timestamp = Date.now();

    // ✅ Save the merged file with the timestamp in the name
    const mergedFilePath = path.join(
      uploadDir,
      `${userId}_${timestamp}_${fileName}`
    );
    await fs.writeFile(mergedFilePath, Buffer.concat(fileBuffer));

    // ✅ Clean up temporary chunk files and directory
    await fs.remove(tempDir);

    // ✅ Return the file URL in the response
    res.json({
      success: true,
      message: "File uploaded and merged successfully!",
      fileUrl: `uploads/${userId}_${timestamp}_${fileName}`,
    });
  } else {
    res.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
    });
  }
});

// ✅ Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

