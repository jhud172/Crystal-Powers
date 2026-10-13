package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class PublicPrivacyServiceTests {
    private static final List<String> IDS=List.of("information","uses","access","providers","retention","choices","browser-storage","payments");
    private String content(String date,String email,List<String> ids) throws Exception {
        return new ObjectMapper().writeValueAsString(new PublicPrivacyService.Document("Synthetic isolated test operator",email,date,ids.stream().map(id->new PublicPrivacyService.Section(id,"Test section","Synthetic isolated test copy, not a published business policy. <script> stays plain text.")).toList()));
    }
    private PublicPrivacyService configured(boolean approval,String input){try(var factory=Validation.buildDefaultValidatorFactory()){return new PublicPrivacyService(new ObjectMapper(),factory.getValidator(),approval,input);}}
    @Test void completeContentIsNotPublicWithoutExplicitApproval() throws Exception {
        var service=configured(false,content("2026-10-12","privacy@example.invalid",IDS));
        assertThat(service.ready()).isFalse();
        assertThatThrownBy(service::published).isInstanceOf(ResponseStatusException.class).hasMessageContaining("not published");
    }
    @Test void completeApprovedContentPreservesAuthoredPlainText() throws Exception {
        var service=configured(true,content("2026-10-12","privacy@example.invalid",IDS));
        assertThat(service.ready()).isTrue();assertThat(service.published().sections()).hasSize(8);
        assertThat(service.published().sections().get(0).body()).contains("<script> stays plain text");
    }
    @Test void malformedMissingDuplicateAndInvalidContactDateStayUnavailable() throws Exception {
        var duplicate=List.of("information","uses","access","providers","retention","choices","browser-storage","information");
        for(String input:List.of("not-json-SYNTHETIC_SECRET",content("2026-99-99","privacy@example.invalid",IDS),content("2026-10-12","bad-email",IDS),content("2026-10-12","privacy@example.invalid",IDS.subList(0,7)),content("2026-10-12","privacy@example.invalid",duplicate))){
            var service=configured(true,input);assertThat(service.ready()).isFalse();assertThat(service.diagnostics().problems()).isNotEmpty();
            assertThat(String.join(" ",service.diagnostics().problems())).doesNotContain("SYNTHETIC_SECRET");
            assertThatThrownBy(service::published).isInstanceOf(ResponseStatusException.class);
        }
    }
}
