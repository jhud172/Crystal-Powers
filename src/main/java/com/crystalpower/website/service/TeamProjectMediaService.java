package com.crystalpower.website.service;

import com.crystalpower.website.repository.MediaRepository.Media;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

@Service
public class TeamProjectMediaService {
    private final TeamProjectService projects;
    private final ProjectMediaService media;
    public TeamProjectMediaService(TeamProjectService projects,ProjectMediaService media) { this.projects=projects;this.media=media; }
    @Transactional
    public List<Media> list(Authentication auth,UUID project) { projects.mediaEditor(auth,project);return media.list(project); }
    public Media upload(Authentication auth,UUID project,MultipartFile file) { return media.uploadChecked(project,file,()->projects.mediaEditor(auth,project)); }
    @Transactional
    public byte[] read(Authentication auth,UUID id) { var image=media.find(id);projects.mediaEditor(auth,image.projectId());return media.read(id); }
}
