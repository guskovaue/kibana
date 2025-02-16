/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SetupReadOnly } from './setup';

export default {
  component: SetupReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/setup',
};

export const Default = () => (
  <SetupReadOnly
    setup={
      'The \'PowerShell Script Block Logging\' logging policy must be enabled.\nSteps to implement the logging policy with Advanced Audit Configuration:\n\n```\nComputer Configuration >\nAdministrative Templates >\nWindows PowerShell >\nTurn on PowerShell Script Block Logging (Enable)\n```\n\nSteps to implement the logging policy via registry:\n\n```\nreg add "hklm\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" /v EnableScriptBlockLogging /t REG_DWORD /d 1\n```'
    }
  />
);

export const EmptyStringValue = () => <SetupReadOnly setup="" />;
