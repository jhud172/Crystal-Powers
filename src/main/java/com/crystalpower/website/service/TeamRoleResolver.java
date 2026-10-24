package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamIdentityRepository.Member;
import com.crystalpower.website.repository.TeamRoleProfileRepository;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.stereotype.Service;
import java.util.Set;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

/** Invalid or archived profiles deny access rather than restoring the broader base role. */
@Service
public class TeamRoleResolver {
    private final TeamRoleProfileRepository profiles;
    private final com.crystalpower.website.security.LocalAutomationAccounts localAccounts;
    public TeamRoleResolver(TeamRoleProfileRepository profiles, com.crystalpower.website.security.LocalAutomationAccounts localAccounts) { this.profiles=profiles; this.localAccounts=localAccounts; }
    public Set<TeamPermission> permissions(Member member) {
        if (!localAccounts.allowed(member)) return Set.of();
        var assigned=profiles.assigned(member.id());
        if(assigned.isEmpty())return member.role().permissions();
        return profiles.profile(member.workspaceId(),assigned.get())
                .filter(profile->!profile.archived() && profile.baseRole()==member.role() && member.role().permissions().containsAll(profile.permissions()))
                .map(TeamRoleProfileRepository.Profile::permissions).orElse(Set.of());
    }
    /** Administration considers retained grants even when an archived profile denies sign-in. */
    public Set<TeamPermission> managementPermissions(Member member) {
        var assigned=profiles.assigned(member.id());
        if(assigned.isEmpty())return member.role().permissions();
        return profiles.profile(member.workspaceId(),assigned.get())
                .filter(profile->profile.baseRole()==member.role() && profile.permissions().contains(TeamPermission.READ_CHANNELS) && member.role().permissions().containsAll(profile.permissions()))
                .map(TeamRoleProfileRepository.Profile::permissions).orElse(member.role().permissions());
    }
    public boolean usable(Member member) { return permissions(member).contains(TeamPermission.READ_CHANNELS); }
    /** Resolve recipient/assignee lists with two workspace queries rather than two per person. */
    public Map<UUID,Set<TeamPermission>> permissions(UUID workspace,List<Member> members) { return batch(workspace,members,false); }
    public Map<UUID,Set<TeamPermission>> managementPermissions(UUID workspace,List<Member> members) { return batch(workspace,members,true); }
    private Map<UUID,Set<TeamPermission>> batch(UUID workspace,List<Member> members,boolean management) {
        Map<UUID,TeamRoleProfileRepository.Profile> definitions=new HashMap<>();
        for(var profile:profiles.profiles(workspace))definitions.put(profile.id(),profile);
        Map<UUID,UUID> assignments=new HashMap<>();
        for(var assignment:profiles.assignments(workspace))if(assignment.profileId()!=null)assignments.put(assignment.memberId(),assignment.profileId());
        Map<UUID,Set<TeamPermission>> result=new HashMap<>();
        for(var member:members) {
            if ((!management && !localAccounts.allowed(member)) || !member.workspaceId().equals(workspace)){result.put(member.id(),Set.of());continue;}
            UUID id=assignments.get(member.id());var profile=id==null ? null : definitions.get(id);
            boolean valid=profile!=null && profile.baseRole()==member.role() && member.role().permissions().containsAll(profile.permissions()) && (!management || profile.permissions().contains(TeamPermission.READ_CHANNELS));
            if(id==null)result.put(member.id(),member.role().permissions());
            else if(valid && (management || !profile.archived()))result.put(member.id(),profile.permissions());
            else result.put(member.id(),management ? member.role().permissions() : Set.of());
        }
        return Map.copyOf(result);
    }

}
