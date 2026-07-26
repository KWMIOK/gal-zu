"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PrefsEditorApi = {
  dirty: boolean;
  saving: boolean;
  save: () => Promise<boolean>;
};

type PreferencesEditContextValue = {
  /** True while the preferences wizard is mounted. */
  active: boolean;
  dirty: boolean;
  saving: boolean;
  save: () => Promise<boolean>;
  registerEditor: (api: PrefsEditorApi) => () => void;
};

const PreferencesEditContext = createContext<PreferencesEditContextValue>({
  active: false,
  dirty: false,
  saving: false,
  save: async () => false,
  registerEditor: () => () => undefined,
});

/**
 * Lets the app header show Save (and warn on leave) while the preferences
 * wizard is open — without lifting all form state into the layout.
 */
export function PreferencesEditProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<PrefsEditorApi | null>(null);
  const apiRef = useRef<PrefsEditorApi | null>(null);

  const registerEditor = useCallback((next: PrefsEditorApi) => {
    apiRef.current = next;
    setApi(next);
    return () => {
      if (apiRef.current === next) {
        apiRef.current = null;
        setApi(null);
      }
    };
  }, []);

  const value = useMemo<PreferencesEditContextValue>(
    () => ({
      active: api !== null,
      dirty: api?.dirty ?? false,
      saving: api?.saving ?? false,
      save: async () => {
        if (!apiRef.current) return false;
        return apiRef.current.save();
      },
      registerEditor,
    }),
    [api, registerEditor],
  );

  return (
    <PreferencesEditContext.Provider value={value}>
      {children}
    </PreferencesEditContext.Provider>
  );
}

export function usePreferencesEdit() {
  return useContext(PreferencesEditContext);
}

/** Called by OnboardingWizard to publish dirty/save into the header. */
export function useRegisterPreferencesEditor(api: PrefsEditorApi) {
  const { registerEditor } = usePreferencesEdit();
  const saveRef = useRef(api.save);
  saveRef.current = api.save;

  useEffect(() => {
    return registerEditor({
      dirty: api.dirty,
      saving: api.saving,
      save: () => saveRef.current(),
    });
  }, [api.dirty, api.saving, registerEditor]);
}
