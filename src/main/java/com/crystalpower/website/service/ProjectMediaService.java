package com.crystalpower.website.service;

import com.crystalpower.website.repository.MediaRepository;
import com.crystalpower.website.repository.MediaRepository.Media;
import com.crystalpower.website.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.IIOImage;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.Semaphore;

@Service
public class ProjectMediaService {
    private final MediaRepository media;
    private final ProjectRepository projects;
    private final MediaStorage storage;
    private final TransactionTemplate transaction;
    private final Semaphore processing = new Semaphore(1);
    public ProjectMediaService(MediaRepository media, ProjectRepository projects, MediaStorage storage, TransactionTemplate transaction) {
        this.media = media; this.projects = projects; this.storage = storage; this.transaction = transaction;
    }
    public List<Media> list(UUID id) { requireProject(id); return media.list(id); }
    public Media find(UUID id) { return media.find(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found.")); }
    public byte[] read(UUID id) { return storage.read(find(id).key()); }
    public Media upload(UUID project, MultipartFile file, UUID owner) {
        requireProject(project);
        if (file.isEmpty() || file.getSize() > 12_000_000) throw bad("Choose a PNG, JPEG or WebP image under 12 MB.");
        if (!processing.tryAcquire()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Another image is processing. Try again in a moment.");
        try {
            if (media.list(project).size() >= 40 || media.storedBytes() >= 850_000_000) throw bad("The image library has reached its storage allowance. Review stored media before uploading more.");
            BufferedImage source;
            try (var input = new MemoryCacheImageInputStream(file.getInputStream())) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw bad("This file is not a readable image.");
                var reader = readers.next();
                try {
                    if (!List.of("png", "jpeg", "jpg", "webp").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) throw bad("Choose a PNG, JPEG or WebP image.");
                    reader.setInput(input, true, true);
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 32 || height < 32 || width > 8192 || height > 8192 || (long) width * height > 16_000_000) throw bad("Use an image between 32 and 8,192 pixels per side and under 16 megapixels.");
                    source = reader.read(0);
                } finally { reader.dispose(); }
            }
            double scale = Math.min(1, 2560.0 / Math.max(source.getWidth(), source.getHeight()));
            int width = Math.max(1, (int) Math.round(source.getWidth() * scale)), height = Math.max(1, (int) Math.round(source.getHeight() * scale));
            BufferedImage sanitised = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            var graphics = sanitised.createGraphics();
            try { graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, width, height); graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC); graphics.drawImage(source, 0, 0, width, height, null); }
            finally { graphics.dispose(); source.flush(); }
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            var writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (var output = new MemoryCacheImageOutputStream(bytes)) {
                writer.setOutput(output);
                var options = writer.getDefaultWriteParam(); options.setCompressionMode(ImageWriteParam.MODE_EXPLICIT); options.setCompressionQuality(0.9f);
                writer.write(null, new IIOImage(sanitised, null, null), options);
            } finally { writer.dispose(); sanitised.flush(); }
            if (bytes.size() > 5_000_000) throw bad("This image is too detailed. Reduce its dimensions and try again.");
            UUID id = UUID.randomUUID();
            Media created = new Media(id, project, id + ".jpg", "image/jpeg", bytes.size(), width, height);
            storage.put(created.key(), bytes.toByteArray());
            // Store first: an interrupted transaction can leave an orphan, never a published broken upload.
            // Backup tooling reconciles such orphaned objects against project_media.
            transaction.executeWithoutResult(status -> { media.insert(created); projects.audit(owner, "PROJECT_IMAGE_UPLOADED", project); });
            return created;
        } catch (IOException | IllegalArgumentException exception) { throw bad("The image could not be decoded. Export it again as PNG, JPEG or WebP."); }
        finally { processing.release(); }
    }
    private void requireProject(UUID id) { if (projects.draft(id).isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."); }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
