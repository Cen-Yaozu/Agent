@runtime
Feature: Runtime Basic Operations
  As a developer using the Runtime
  I want to manage Containers and Agents
  So that I can run AI agents in isolated environments

  Background:
    Given a Runtime instance is created

  # ============================================================================
  # Container Operations
  # ============================================================================

  Rule: Container Creation and Management

    Scenario: Create a new container
      When I create a container with id "container-1"
      Then the container "container-1" should exist
      And the container should have 0 agents

    Scenario: Create multiple containers
      When I create a container with id "container-1"
      And I create a container with id "container-2"
      Then the container "container-1" should exist
      And the container "container-2" should exist

    Scenario: Dispose a container
      Given a container "container-1" exists
      When I dispose the container "container-1"
      Then the container "container-1" should not exist

    Scenario: Dispose container destroys all agents
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And an agent "agent-2" is running in container "container-1"
      When I dispose the container "container-1"
      Then the container "container-1" should not exist
      And the agent "agent-1" should be destroyed
      And the agent "agent-2" should be destroyed

  # ============================================================================
  # Agent Operations
  # ============================================================================

  Rule: Agent Lifecycle Management

    Scenario: Run an agent in a container
      Given a container "container-1" exists
      When I run an agent with config:
        | name         | Assistant       |
        | systemPrompt | You are helpful |
      Then the agent should be created with lifecycle "running"
      And the container should have 1 agent

    Scenario: Run multiple agents in a container
      Given a container "container-1" exists
      When I run an agent with name "Agent-1" in container "container-1"
      And I run an agent with name "Agent-2" in container "container-1"
      Then the container "container-1" should have 2 agents

    Scenario: Get an agent by ID
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      When I get the agent "agent-1" from container "container-1"
      Then I should receive the agent with id "agent-1"

    Scenario: Get non-existent agent returns undefined
      Given a container "container-1" exists
      When I get the agent "non-existent" from container "container-1"
      Then I should receive undefined

    Scenario: List all agents in a container
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And an agent "agent-2" is running in container "container-1"
      When I list agents in container "container-1"
      Then I should receive 2 agents

    Scenario: Destroy an agent
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      When I destroy the agent "agent-1"
      Then the agent "agent-1" should have lifecycle "destroyed"
      And the container should have 0 agents

    Scenario: Destroy non-existent agent returns false
      Given a container "container-1" exists
      When I try to destroy agent "non-existent" in container "container-1"
      Then the operation should return false

    Scenario: Destroy all agents in a container
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And an agent "agent-2" is running in container "container-1"
      When I destroy all agents in container "container-1"
      Then the container "container-1" should have 0 agents

  # ============================================================================
  # Agent Stop/Resume
  # ============================================================================

  Rule: Agent Stop and Resume

    Scenario: Stop a running agent
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      When I stop the agent "agent-1"
      Then the agent "agent-1" should have lifecycle "stopped"

    Scenario: Resume a stopped agent
      Given a container "container-1" exists
      And an agent "agent-1" is stopped in container "container-1"
      When I resume the agent "agent-1"
      Then the agent "agent-1" should have lifecycle "running"

    Scenario: Cannot resume a destroyed agent
      Given a container "container-1" exists
      And an agent "agent-1" is destroyed in container "container-1"
      When I try to resume the agent "agent-1"
      Then the operation should fail with error "Cannot resume destroyed agent"

  # ============================================================================
  # Agent Interaction
  # ============================================================================

  Rule: Agent Message Interaction

    Scenario: Send a message to an agent
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      When I send message "Hello" to agent "agent-1"
      Then the agent should process the message

    Scenario: Cannot send message to stopped agent
      Given a container "container-1" exists
      And an agent "agent-1" is stopped in container "container-1"
      When I try to send message "Hello" to agent "agent-1"
      Then the operation should fail with error "Cannot send message to stopped agent"

    Scenario: Interrupt agent processing
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And the agent is processing a message
      When I interrupt the agent "agent-1"
      Then the agent should stop processing

  # ============================================================================
  # Image Operations (Snapshot/Resume)
  # ============================================================================

  Rule: Agent Snapshot and Resume

    Scenario: Snapshot an agent creates an image
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      When I snapshot the agent "agent-1"
      Then an image should be created
      And the image should have containerId "container-1"
      And the image should have name "agent-1"

    @pending
    Scenario: Snapshot captures conversation history
      # Pending: MockEnvironment produces stream events, not message events
      # Agent Engine needs to convert stream → message for this to work
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And the agent "agent-1" has received messages
      When I snapshot the agent "agent-1"
      Then the image should contain the messages

    Scenario: Resume an image creates a new agent
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I have snapshotted the agent "agent-1"
      When I resume the image
      Then a new agent should be created
      And the new agent should have lifecycle "running"
      And the new agent should be in container "container-1"

    @pending
    Scenario: Resume restores conversation history
      # Pending: MockEnvironment produces stream events, not message events
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And the agent "agent-1" has received messages
      And I have snapshotted the agent "agent-1"
      When I resume the image
      Then the new agent should have the same messages

    Scenario: Resume fails if container not found
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I have snapshotted the agent "agent-1"
      And the container "container-1" is disposed
      When I try to resume the image
      Then the operation should fail with error "Container not found"

    Scenario: List all images
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I have snapshotted the agent "agent-1"
      And an agent "agent-2" is running in container "container-1"
      And I have snapshotted the agent "agent-2"
      When I list all images
      Then I should receive 2 images

    Scenario: Get image by ID
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I have snapshotted the agent "agent-1"
      When I get the image by ID
      Then I should receive the image

    Scenario: Get non-existent image returns null
      When I get image with ID "non-existent"
      Then I should receive null

    Scenario: Delete an image
      Given a container "container-1" exists
      And an agent "agent-1" is running in container "container-1"
      And I have snapshotted the agent "agent-1"
      When I delete the image
      Then the image should no longer exist

  # ============================================================================
  # Runtime Lifecycle
  # ============================================================================

  Rule: Runtime Disposal

    Scenario: Dispose runtime cleans up all containers
      Given a container "container-1" exists
      And a container "container-2" exists
      And an agent "agent-1" is running in container "container-1"
      When I dispose the runtime
      Then all containers should be disposed
      And all agents should be destroyed
