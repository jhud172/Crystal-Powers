package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksWindowsRelease;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DocksReleaseController {
    private static final String ROOT = "/api/docks/releases/windows-x64";
    private final DocksWindowsRelease releases;

    public DocksReleaseController(DocksWindowsRelease releases) { this.releases = releases; }

    @GetMapping(ROOT)
    public ResponseEntity<Map<String, String>> current() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
                releases.current().map(value -> Map.of("version", value.version())).orElseGet(Map::of));
    }

    @GetMapping(ROOT + "/{version}/download")
    public ResponseEntity<Void> download(@PathVariable("version") String version) {
        return releases.current().filter(value -> value.version().equals(version))
                .map(value -> ResponseEntity.status(HttpStatus.FOUND).cacheControl(CacheControl.noStore())
                        .location(value.asset()).<Void>build())
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build());
    }

}
