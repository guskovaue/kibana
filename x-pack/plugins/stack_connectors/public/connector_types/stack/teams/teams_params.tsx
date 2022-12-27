/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { TeamsActionParams } from '../../types';
import {
  EuiSpacer,
  EuiFormRow,
  EuiAccordion,
  EuiButtonEmpty,
  EuiForm,
  EuiFieldText
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const TeamsParamsFields: React.FunctionComponent<ActionParamsProps<TeamsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}) => {
  const { message } = actionParams;
  useEffect(() => {
    if (!message && defaultMessage && defaultMessage.length > 0) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editAction}
        messageVariables={messageVariables}
        paramsProperty={'message'}
        inputTargetValue={message}
        label={i18n.translate('xpack.stackConnectors.components.teams.messageTextAreaFieldLabel', {
          defaultMessage: 'Message',
        })}
        errors={(errors.message ?? []) as string[]}
      />
      <EuiSpacer size="m" />
      <EuiAccordion
        id={'test'}
        arrowDisplay="none"
        paddingSize="l"
        buttonContent={
          <EuiButtonEmpty
              size="xs"
              data-test-subj={'Test'}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionTypeForm.advancedSettings"
                defaultMessage="Advanced settings"
              />
            </EuiButtonEmpty>
        }
      >     
        <EuiForm component="form">
          <EuiFormRow label="Title">
            <EuiFieldText/>
          </EuiFormRow>
          <EuiFormRow label="Subtitle">
            <EuiFieldText/>
          </EuiFormRow>
          {/* <EuiFormRow label="Image">
            <EuiFieldText/>
          </EuiFormRow> */}
        </EuiForm>
      </EuiAccordion>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TeamsParamsFields as default };
