const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const qualityRange = document.getElementById("qualityRange");
const qualityValue = document.getElementById("qualityValue");
const maxWidthInput = document.getElementById("maxWidth");
const maxHeightInput = document.getElementById("maxHeight");
const convertPngCheckbox = document.getElementById("convertPng");
const compressBtn = document.getElementById("compressBtn");
const statusText = document.getElementById("status");
const resultList = document.getElementById("resultList");

let selectedFiles = [];

// 품질 표시
qualityRange.addEventListener("input", () => {
  qualityValue.textContent = qualityRange.value;
});

// 파일 선택
fileInput.addEventListener("change", (e) => {
  selectedFiles = Array.from(e.target.files);
  statusText.textContent = `${selectedFiles.length}개의 파일 선택됨.`;
});

// 드래그 앤 드롭
["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.type.startsWith("image/")
  );
  selectedFiles = files;
  statusText.textContent = `${selectedFiles.length}개의 파일 선택됨.`;
});

// 압축 버튼
compressBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) {
    alert("먼저 이미지를 선택하세요.");
    return;
  }

  const quality = parseFloat(qualityRange.value);
  const maxWidth = parseInt(maxWidthInput.value, 10) || 1920;
  const maxHeight = parseInt(maxHeightInput.value, 10) || 1080;
  const convertPng = convertPngCheckbox.checked;

  statusText.textContent =
    "압축 중입니다. 이미지 크기에 따라 시간이 걸릴 수 있습니다...";
  resultList.innerHTML = "";

  for (const file of selectedFiles) {
    try {
      const result = await compressImage(file, {
        quality,
        maxWidth,
        maxHeight,
        convertPng,
      });
      appendResultItem(result);
    } catch (err) {
      console.error(err);
      const errorDiv = document.createElement("div");
      errorDiv.textContent = `${file.name} 처리 중 오류 발생`;
      resultList.appendChild(errorDiv);
    }
  }

  statusText.textContent = "압축 완료!";
});

// 실제 압축 함수
function compressImage(file, { quality, maxWidth, maxHeight, convertPng }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      // 비율 유지하면서 최대 크기 맞추기
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const isPng = file.type === "image/png";
      const mimeType =
        isPng && convertPng ? "image/jpeg" : file.type || "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Blob 생성 실패"));
            return;
          }

          const originalSize = file.size;
          const compressedSize = blob.size;

          const result = {
            originalName: file.name,
            originalSize,
            compressedSize,
            blob,
            downloadName: makeDownloadName(file.name, mimeType),
          };

          URL.revokeObjectURL(url);
          resolve(result);
        },
        mimeType,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

function makeDownloadName(originalName, mimeType) {
  const ext =
    mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/png" ? ".png" : "";
  const base = originalName.replace(/\.[^.]+$/, "");
  return base + "-compressed" + ext;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return value.toFixed(1) + " " + sizes[i];
}

function appendResultItem({
  originalName,
  originalSize,
  compressedSize,
  blob,
  downloadName,
}) {
  // 기존 화면에 결과 정보는 그대로 보여줄 수 있음
  const item = document.createElement("div");
  item.className = "result-item";

  const info = document.createElement("div");
  info.className = "info";

  info.innerHTML = `
    <div>${originalName}</div>
    <div>원본: ${formatBytes(originalSize)} → 압축: ${formatBytes(
    compressedSize
  )}</div>
  `;

  item.appendChild(info);
  resultList.appendChild(item);

  // 🔥🔥🔥 자동 다운로드 실행!
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
