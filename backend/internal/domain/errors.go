package domain

import (
	"errors"
	"fmt"
)

var (
	ErrNotFound          = errors.New("resource not found")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrForbidden         = errors.New("access forbidden")
	ErrInvalidInput      = errors.New("invalid input")
	ErrConflict          = errors.New("resource conflict")
	ErrInternalServer    = errors.New("internal server error")
	ErrInvalidInitData   = errors.New("invalid telegram init data")
	ErrExpiredInitData   = errors.New("telegram init data expired")
	ErrInvalidBoardType  = errors.New("invalid board type")
	ErrInvalidItemStatus = errors.New("invalid item status")
)

type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
	Err     error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Code:    404,
		Message: fmt.Sprintf("%s not found", resource),
		Err:     ErrNotFound,
	}
}

func NewUnauthorizedError(message string) *AppError {
	return &AppError{
		Code:    401,
		Message: message,
		Err:     ErrUnauthorized,
	}
}

func NewForbiddenError(message string) *AppError {
	return &AppError{
		Code:    403,
		Message: message,
		Err:     ErrForbidden,
	}
}

func NewBadRequestError(message string) *AppError {
	return &AppError{
		Code:    400,
		Message: message,
		Err:     ErrInvalidInput,
	}
}

func NewConflictError(message string) *AppError {
	return &AppError{
		Code:    409,
		Message: message,
		Err:     ErrConflict,
	}
}

func NewInternalError(err error) *AppError {
	return &AppError{
		Code:    500,
		Message: "internal server error",
		Err:     err,
	}
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

func IsUnauthorized(err error) bool {
	return errors.Is(err, ErrUnauthorized)
}

func IsForbidden(err error) bool {
	return errors.Is(err, ErrForbidden)
}
