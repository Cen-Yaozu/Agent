Feature: Agent Lifecycle
  As a developer
  I want to create and destroy agents
  So that I can manage AI conversation instances

  Background:
    Given a mock driver named "TestDriver"
    And a mock presenter named "TestPresenter"

  # ==================== Create ====================

  Scenario: Create agent with driver and presenter
    When I create an agent with the driver and presenter
    Then the agent should be created successfully
    And the agent should have a unique agentId
    And the agent createdAt should be set
    And the agent state should be "idle"
    And the agent messageQueue should be empty

  Scenario: Create multiple agents
    When I create 3 agents with different drivers
    Then each agent should have a unique agentId

  # ==================== Lifecycle Events ====================

  Scenario: onReady called immediately if already running
    Given an agent is created
    When I subscribe to onReady
    Then the handler should be called immediately

  Scenario: onDestroy called when agent is destroyed
    Given an agent is created
    And I subscribe to onDestroy
    When I call destroy on the agent
    Then the onDestroy handler should be called
