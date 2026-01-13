"""Query counter utility for validating N+1 query elimination.

This module provides a context manager to count SQL queries executed during
test execution, helping validate that refactored code uses the expected
number of queries.

Example:
    >>> from app.core.database import get_session
    >>> with QueryCounter() as counter:
    ...     with get_session() as db:
    ...         user = db.execute(select(User)).first()
    ... # counter.count == 1
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine


class QueryCounter:
    """Context manager to count SQL queries executed in a block.

    Attributes:
        count: Number of queries executed
        queries: List of executed query strings (if record=True)

    Example:
        Validate single query execution:
        >>> with QueryCounter() as counter:
        ...     # Code that should execute exactly 1 query
        ...     pass
        >>> assert counter.count == 1, f"Expected 1 query, got {counter.count}"
    """

    def __init__(self, record: bool = False, verbose: bool = False) -> None:
        """Initialize QueryCounter.

        Args:
            record: If True, store query strings for inspection
            verbose: If True, print queries as they're executed
        """
        self.count = 0
        self.queries: list[str] = []
        self.record = record
        self.verbose = verbose
        self._listener = None

    def __enter__(self) -> QueryCounter:
        """Enter context and start counting queries."""
        from sqlalchemy import event
        from sqlalchemy.pool import Pool

        # Use Pool.connect event to track all queries
        def receive_before_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            self.count += 1
            if self.record:
                self.queries.append(statement)
            if self.verbose:
                print(f"Query #{self.count}: {statement}")

        self._listener = receive_before_cursor_execute
        event.listen(Pool, "before_cursor_execute", self._listener)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exit context and stop counting queries."""
        if self._listener:
            from sqlalchemy import event
            from sqlalchemy.pool import Pool

            event.remove(Pool, "before_cursor_execute", self._listener)

    def assert_count(self, expected: int) -> None:
        """Assert that the expected number of queries were executed.

        Args:
            expected: Expected query count

        Raises:
            AssertionError: If actual count doesn't match expected
        """
        assert self.count == expected, f"Expected {expected} queries, got {self.count}"

    def assert_at_most(self, max_queries: int) -> None:
        """Assert that at most max_queries were executed.

        Args:
            max_queries: Maximum allowed queries

        Raises:
            AssertionError: If actual count exceeds maximum
        """
        assert (
            self.count <= max_queries
        ), f"Expected at most {max_queries} queries, got {self.count}"
