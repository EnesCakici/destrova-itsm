import { useEffect, useState } from "react";
import { createTicket, getAllProducts, uploadAttachment } from "../services/api";



const defaultForm = {
  title: "",
  description: "",
  productId: "",
  priority: "MEDIUM",
};

const priorityCards = [
  {
    value: "HIGH",
    title: "Yuksek",
    description: "Kritik sorun, acil mudahale gerekir.",
    tone: "high",
    icon: "⚠",
  },
  {
    value: "MEDIUM",
    title: "Orta",
    description: "Onemli sorun, planli cozum.",
    tone: "medium",
    icon: "◔",
  },
  {
    value: "LOW",
    title: "Dusuk",
    description: "Gelistirme talebi, minor hata.",
    tone: "low",
    icon: "✓",
  },
];

function TicketForm({ onTicketCreated }) {
  const [formData, setFormData] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState({ type: "", text: "" });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const response = await getAllProducts();
        setProducts(Array.isArray(response) ? response : []);
      } catch (loadError) {
        console.error(loadError.response?.data || loadError.message);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getValidFiles = (selectedFiles) => {
    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    const validFiles = [];
    for (const file of selectedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} 10MB sinirini asiyor.`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`${file.name} desteklenmeyen dosya turu.`);
        continue;
      }
      validFiles.push(file);
    }
    return validFiles;
  };

  const addFiles = (selectedFiles) => {
    if (!selectedFiles.length) return;
    setError("");
    setUploadMessage({ type: "", text: "" });
    const validFiles = getValidFiles(selectedFiles);
    setFiles((prev) => {
      const existing = new Set(prev.map((file) => `${file.name}-${file.size}`));
      const appended = validFiles.filter((file) => !existing.has(`${file.name}-${file.size}`));
      return [...prev, ...appended];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setUploadMessage({ type: "", text: "" });

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title ve Description alanlari zorunludur.");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: "NEW",
      };
      if (formData.productId) {
        payload.product = { id: Number(formData.productId) };
      }
      const createdTicket = await createTicket({ 
        ...payload,
      });

      let uploadedCount = 0;
      let failedCount = 0;
      const totalFiles = files.length;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          await uploadAttachment(createdTicket.id, file, (progressEvent) => {
            if (!progressEvent.total || totalFiles === 0) return;
            const fileProgress = progressEvent.loaded / progressEvent.total;
            const overallProgress = ((index + fileProgress) / totalFiles) * 100;
            setUploadProgress(Math.min(100, Math.round(overallProgress)));
          });
          uploadedCount += 1;
        } catch (uploadError) {
          failedCount += 1;
          console.error(uploadError.response?.data || uploadError.message);
        }
      }

      if (uploadedCount > 0 && failedCount === 0) {
        setUploadMessage({ type: "success", text: "Dosyalar basariyla yuklendi." });
      } else if (uploadedCount > 0 && failedCount > 0) {
        setUploadMessage({
          type: "error",
          text: `${uploadedCount} dosya yuklendi, ${failedCount} dosya yuklenemedi.`,
        });
      } else if (files.length > 0 && failedCount > 0) {
        setUploadMessage({ type: "error", text: "Dosya yukleme basarisiz oldu." });
      }

      setFiles([]);
      setUploadProgress(0);

      setFormData(defaultForm);
      if (onTicketCreated) {
        onTicketCreated();
      }
    } catch (submitError) {
      setError("Ticket olusturulurken bir hata olustu.");
      console.error(submitError.response?.data || submitError.message);
    } finally {
      setUploadProgress(0);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h2>Yeni Ticket Ac</h2>
      <form className="ticket-form premium-ticket-form" onSubmit={handleSubmit}>
        <label>
          Konu
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Kisa ticket basligi yazin"
          />
        </label>

        <label>
          Aciklama
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            placeholder="Sorunu detayli aciklayin"
          />
        </label>

        <label>
          Urun Secimi
          <select name="productId" value={formData.productId} onChange={handleChange}>
            <option value="">{isLoadingProducts ? "Yukleniyor..." : "Urun secin"}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <div className="priority-group">
          <span>Oncelik Secimi</span>
          <div className="priority-card-grid">
            {priorityCards.map((card) => (
              <button
                key={card.value}
                type="button"
                className={`priority-card priority-card-${card.tone} ${
                  formData.priority === card.value ? "active" : ""
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, priority: card.value }))}
              >
                {formData.priority === card.value ? <span className="priority-selected-mark">✓</span> : null}
                <div className="priority-card-head">
                  <span className="priority-card-icon">{card.icon}</span>
                  <strong>{card.title}</strong>
                </div>
                <small>{card.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div
          className="upload-dropzone"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDropActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDropActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDropActive(false);
            addFiles(Array.from(event.dataTransfer.files || []));
          }}
        >
  <p className="upload-title">Dosya Yukleme</p>

  <label
    className="upload-box"
    style={isDropActive ? { borderColor: "#3b82f6", background: "#eff6ff" } : undefined}
  >
    <input
      type="file"
      multiple
      style={{ display: "none" }}
      onChange={(e) => {
        addFiles(Array.from(e.target.files || []));
        e.target.value = "";
      }}
    />

    <div className="upload-icon">☁</div>
    <p>Dosya secmek icin tiklayin</p>
    <small>Birden fazla dosya secebilirsiniz (.jpg, .png, .pdf, max 10MB)</small>
  </label>

  {files.length > 0 ? (
    <ul className="selected-file-list">
      {files.map((file, index) => (
        <li key={`${file.name}-${index}`}>
          <span>
            {file.name} - {Math.round(file.size / 1024)} KB
          </span>
          <button
            type="button"
            className="btn btn-link"
            onClick={() => {
              setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
              setUploadMessage({ type: "", text: "" });
            }}
          >
            Kaldir
          </button>
        </li>
      ))}
    </ul>
  ) : null}
  {isSubmitting && files.length > 0 ? (
    <div style={{ marginTop: "8px" }}>
      <small>Upload ilerlemesi: %{uploadProgress}</small>
      <div
        style={{
          height: "6px",
          background: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            width: `${uploadProgress}%`,
            height: "100%",
            background: "#3b82f6",
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  ) : null}
</div>

{error && <p className="error-text">{error}</p>}
{uploadMessage.text ? (
  <p
    className={uploadMessage.type === "error" ? "error-text" : ""}
    style={
      uploadMessage.type === "success"
        ? { margin: 0, color: "#047857", fontSize: "13px", fontWeight: 600 }
        : undefined
    }
  >
    {uploadMessage.text}
  </p>
) : null}

<button className="btn btn-primary" type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Olusturuluyor..." : "Bilet Olustur"}
</button>
</form>
</section>
);
}

export default TicketForm;