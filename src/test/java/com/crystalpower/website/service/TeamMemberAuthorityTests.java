package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.TeamRoleProfileRepository;
import com.crystalpower.website.security.TeamPermission;
import com.crystalpower.website.security.TeamRole;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TeamMemberAuthorityTests {
    private static final Set<TeamPermission> LIMITED=Set.of(TeamPermission.READ_CHANNELS,TeamPermission.MANAGE_MEMBERS,TeamPermission.MANAGE_ROLES);
    @Test void aDelegatedManagerCannotResetReplaceCancelOrChangeAHigherAccount(){
        var workspace=UUID.randomUUID();var target=UUID.randomUUID();
        var actor=new TeamAccessService.Actor(workspace,null,UUID.randomUUID(),"Delegated manager",LIMITED);
        var profiles=mock(TeamRoleProfileRepository.class);when(profiles.assigned(target)).thenReturn(Optional.empty());
        var authority=new TeamMemberAuthority(new TeamRoleResolver(profiles,new com.crystalpower.website.security.LocalAutomationAccounts(new org.springframework.mock.env.MockEnvironment())));
        var access=mock(TeamAccessService.class);var auth=mock(Authentication.class);when(access.resolve(auth)).thenReturn(actor);when(access.resolveLocked(auth)).thenReturn(actor);
        var accounts=mock(TeamIdentityRepository.class);
        when(accounts.member(workspace,target)).thenReturn(Optional.of(new TeamIdentityRepository.Member(target,workspace,"admin@example.invalid","Administrator",TeamRole.ADMIN,"INVITED",0)));
        var service=new TeamMemberService(access,accounts,mock(OwnerRepository.class),authority);
        assertThatThrownBy(()->service.reset(auth,target,0)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("greater permissions");
        assertThatThrownBy(()->service.reissue(auth,target,0)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("greater permissions");
        assertThatThrownBy(()->service.cancel(auth,target,0)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("greater permissions");
        assertThatThrownBy(()->service.change(auth,target,0,TeamRole.MEMBER,"SUSPENDED")).isInstanceOf(ResponseStatusException.class).hasMessageContaining("greater permissions");
        verify(accounts,never()).resetCredentials(any(),any(),anyInt());
        verify(accounts,never()).cancelInvitation(any(),any(),anyInt());
        verify(accounts,never()).change(any(),any(),anyInt(),any(),anyString());
        verify(accounts,never()).invite(any(),any(),any(),anyString(),any());
    }
    @Test void archivingAHigherProfileDoesNotMakeItsAccountRecoverableByALowerManager(){
        var workspace=UUID.randomUUID();var target=UUID.randomUUID();var profile=UUID.randomUUID();
        var account=new TeamIdentityRepository.Member(target,workspace,"admin@example.invalid","Administrator",TeamRole.ADMIN,"ACTIVE",4);
        var profiles=mock(TeamRoleProfileRepository.class);when(profiles.assigned(target)).thenReturn(Optional.of(profile));
        when(profiles.profile(workspace,profile)).thenReturn(Optional.of(new TeamRoleProfileRepository.Profile(profile,workspace,"Retained privileged profile",TeamRole.ADMIN,TeamRole.ADMIN.permissions(),true,3)));
        var resolver=new TeamRoleResolver(profiles,new com.crystalpower.website.security.LocalAutomationAccounts(new org.springframework.mock.env.MockEnvironment()));
        assertThat(resolver.permissions(account)).isEmpty();
        var actor=new TeamAccessService.Actor(workspace,null,UUID.randomUUID(),"Delegated manager",LIMITED);
        assertThatThrownBy(()->new TeamMemberAuthority(resolver).requireManage(actor,account)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("greater permissions");
    }
    @Test void legitimatePeerAndOwnerManagementRemainAllowedButSelfAndForeignAccessDoNot(){
        var workspace=UUID.randomUUID();var target=UUID.randomUUID();var profile=UUID.randomUUID();
        var account=new TeamIdentityRepository.Member(target,workspace,"peer@example.invalid","Peer",TeamRole.ADMIN,"ACTIVE",2);
        var profiles=mock(TeamRoleProfileRepository.class);when(profiles.assigned(target)).thenReturn(Optional.of(profile));
        when(profiles.profile(workspace,profile)).thenReturn(Optional.of(new TeamRoleProfileRepository.Profile(profile,workspace,"Bounded peer",TeamRole.ADMIN,LIMITED,false,0)));
        var authority=new TeamMemberAuthority(new TeamRoleResolver(profiles,new com.crystalpower.website.security.LocalAutomationAccounts(new org.springframework.mock.env.MockEnvironment())));
        assertThatCode(()->authority.requireManage(new TeamAccessService.Actor(workspace,null,UUID.randomUUID(),"Peer manager",LIMITED),account)).doesNotThrowAnyException();
        assertThatCode(()->authority.requireManage(new TeamAccessService.Actor(workspace,UUID.randomUUID(),null,"Owner",TeamRole.ADMIN.permissions()),account)).doesNotThrowAnyException();
        assertThatThrownBy(()->authority.requireManage(new TeamAccessService.Actor(workspace,null,target,"Self",LIMITED),account)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("another admin");
        assertThatThrownBy(()->authority.requireManage(new TeamAccessService.Actor(UUID.randomUUID(),UUID.randomUUID(),null,"Foreign owner",TeamRole.ADMIN.permissions()),account)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("unavailable");
    }
    @Test void batchedManagementFlagsPreserveArchivedAndWorkspaceBoundaries(){
        var workspace=UUID.randomUUID();var manager=UUID.randomUUID();var high=UUID.randomUUID();var peer=UUID.randomUUID();var highProfile=UUID.randomUUID();var peerProfile=UUID.randomUUID();
        var profiles=mock(TeamRoleProfileRepository.class);
        when(profiles.profiles(workspace)).thenReturn(java.util.List.of(new TeamRoleProfileRepository.Profile(highProfile,workspace,"Archived administrator",TeamRole.ADMIN,TeamRole.ADMIN.permissions(),true,1),new TeamRoleProfileRepository.Profile(peerProfile,workspace,"Bounded peer",TeamRole.ADMIN,LIMITED,false,0)));
        when(profiles.assignments(workspace)).thenReturn(java.util.List.of(new TeamRoleProfileRepository.Assignment(high,highProfile,2),new TeamRoleProfileRepository.Assignment(peer,peerProfile,1)));
        var accounts=java.util.List.of(new TeamIdentityRepository.Member(high,workspace,"high@example.invalid","High",TeamRole.ADMIN,"SUSPENDED",2),new TeamIdentityRepository.Member(peer,workspace,"peer@example.invalid","Peer",TeamRole.ADMIN,"ACTIVE",1),new TeamIdentityRepository.Member(manager,workspace,"self@example.invalid","Self",TeamRole.ADMIN,"ACTIVE",1),new TeamIdentityRepository.Member(UUID.randomUUID(),UUID.randomUUID(),"foreign@example.invalid","Foreign",TeamRole.MEMBER,"ACTIVE",0));
        var authority=new TeamMemberAuthority(new TeamRoleResolver(profiles,new com.crystalpower.website.security.LocalAutomationAccounts(new org.springframework.mock.env.MockEnvironment())));
        assertThat(authority.manageableMembers(new TeamAccessService.Actor(workspace,null,manager,"Delegated",LIMITED),accounts)).containsExactly(peer);
        verify(profiles,never()).assigned(any());
        verify(profiles,never()).profile(any(),any());
    }

}
