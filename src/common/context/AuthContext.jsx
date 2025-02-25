import React, { createContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import bc from '../services/breathecode';
import { isWindow, removeURLParameter } from '../../utils';
import axiosInstance from '../../axios';
import { usePersistent } from '../hooks/usePersistent';

const initialState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'INIT': {
      const { isLoading, isAuthenticated, user } = action.payload;
      return {
        ...state,
        isLoading,
        isAuthenticated,
        user,
      };
    }
    case 'LOGIN': {
      const { user } = action.payload;
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user,
      };
    }
    case 'CHOOSE': {
      return {
        ...state,
        isAuthenticated: true,
        user: {
          ...state.user,
          active_cohort: action.payload,
        },
      };
    }
    case 'LOGOUT': {
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      };
    }
    case 'REGISTER': {
      const { user } = action.payload;
      return {
        ...state,
        isAuthenticated: true,
        user,
      };
    }
    case 'UPDATE_PROFILE_PICTURE': {
      return {
        ...state,
        isLoading: false,
        user: action.payload,
      };
    }
    default: {
      return { ...state };
    }
  }
};

const setSession = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
    axiosInstance.defaults.headers.common.Authorization = `Token ${token}`;
  } else {
    localStorage.removeItem('syllabus');
    localStorage.removeItem('programMentors');
    localStorage.removeItem('programServices');
    localStorage.removeItem('cohortSession');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('taskTodo');
    localStorage.removeItem('profile');
    localStorage.removeItem('sortedAssignments');
    delete axiosInstance.defaults.headers.common.Authorization;
  }
};

const getToken = () => {
  if (isWindow) {
    const query = new URLSearchParams(window.location.search || '');
    const queryToken = query.get('token')?.split('?')[0]; // sometimes endpoint redirection returns 2 ?token querystring
    if (queryToken) return queryToken;
    return localStorage.getItem('accessToken');
  }
  return null;
};

export const AuthContext = createContext({
  ...initialState,
});

const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [profile, setProfile] = usePersistent('profile', {});

  const query = isWindow && new URLSearchParams(window.location.search || '');
  const queryToken = isWindow && query.get('token')?.split('?')[0];
  const cleanUrl = isWindow && removeURLParameter(window.location.href, 'token');
  const queryTokenExists = isWindow && queryToken !== undefined && queryToken.length > 0;

  // Validate and Fetch user token from localstorage when it changes
  const handleSession = (tokenString) => setSession(tokenString);

  useEffect(async () => {
    const token = getToken();

    if (token !== undefined && token !== null) {
      const requestToken = await fetch(`${process.env.BREATHECODE_HOST}/v1/auth/token/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (requestToken.status >= 400) {
        handleSession(null);
        if (!queryTokenExists) {
          router.reload();
        } else {
          router.push(cleanUrl);
        }
        dispatch({
          type: 'INIT',
          payload: { user: null, isAuthenticated: false, isLoading: false },
        });
      } else {
        handleSession(token);
        bc.auth().me()
          .then(({ data }) => {
            dispatch({
              type: 'INIT',
              payload: { user: data, isAuthenticated: true, isLoading: false },
            });
            setProfile({
              ...profile,
              ...data,
            });
            if (data.github) {
              localStorage.setItem('showGithubWarning', 'closed');
            } else if (!localStorage.getItem('showGithubWarning') || localStorage.getItem('showGithubWarning') !== 'postponed') {
              localStorage.setItem('showGithubWarning', 'active');
            }
          })
          .catch(() => {
            handleSession(null);
          });
      }
    }

    return null;
  }, [router]);

  const login = async (payload = null) => {
    const redirect = isWindow && localStorage.getItem('redirect');
    try {
      if (payload) {
        const response = await bc.auth().login(payload);
        if (response.status === 200) {
          handleSession(response.data.token || response.token);
          dispatch({
            type: 'LOGIN',
            payload: response.data,
          });
          if (redirect && redirect.length > 0) {
            router.push(redirect);
            localStorage.removeItem('redirect');
          } else {
            router.push('/choose-program');
            localStorage.removeItem('redirect');
          }
        }
        return response;
      }
      throw Error('Empty values');
    } catch (e) {
      const message = e.details || e.detail || Array.isArray(e.non_field_errors)
        ? e.non_field_errors[0]
        : 'Unable to login';
      throw Error(message);
    }
  };

  const register = async (payload = null) => {
    try {
      if (payload) {
        const response = await bc.auth().register(payload);
        if (response.status === 200) {
          handleSession(response.data.token || response.token);
          dispatch({
            type: 'REGISTER',
            payload: {
              isLoading: false,
              isAuthenticated: true,
              user: response.data,
            },
          });
        }
        return response;
      }
      throw Error('Empty values');
    } catch (e) {
      const message = e.details || e.detail || Array.isArray(e.non_field_errors)
        ? e.non_field_errors[0]
        : 'Unable to register';
      throw Error(message);
    }
  };

  const choose = async (payload) => {
    dispatch({
      type: 'CHOOSE',
      payload,
    });
  };

  const logout = () => {
    if (queryTokenExists) {
      router.push(cleanUrl);
    } else {
      router.reload();
    }
    handleSession(null);
    setProfile({});
    localStorage.removeItem('showGithubWarning');
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfilePicture = async (payload) => {
    dispatch({
      type: 'UPDATE_PROFILE_PICTURE',
      payload,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        method: 'Bearer',
        login,
        logout,
        register,
        choose,
        updateProfilePicture,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

AuthProvider.defaultProps = {
  children: null,
};

export default AuthProvider;
