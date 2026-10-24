package com.crystalpower.website.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public final class AssistantChat {
 private AssistantChat() {}
 public record Turn(@NotNull @Pattern(regexp="user|assistant") String role,@NotBlank @Size(max=1200) String content) {}
 public record Request(@NotBlank @Size(max=1200) String message,@NotNull @Size(max=6) List<@NotNull @Valid Turn> history,@NotNull @Size(max=200) @Pattern(regexp="/(about|services|support|contact|portfolio(/[-a-z0-9]+)?)?") String page) {}
 public record Source(String label,String href) {}
 public record Reply(String answer,List<Source> sources,String availability) {}
}
