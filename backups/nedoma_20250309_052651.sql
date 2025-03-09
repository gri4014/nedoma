--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Debian 14.17-1.pgdg120+1)
-- Dumped by pg_dump version 14.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: swipe_direction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.swipe_direction AS ENUM (
    'left',
    'right',
    'up'
);


ALTER TYPE public.swipe_direction OWNER TO postgres;

--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_expired_sessions() OWNER TO postgres;

--
-- Name: update_event_tags_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_event_tags_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_event_tags_updated_at() OWNER TO postgres;

--
-- Name: update_events_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_events_updated_at() OWNER TO postgres;

--
-- Name: update_last_active_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_last_active_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_active_at() OWNER TO postgres;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_event_subcategories(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_subcategories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if all subcategories exist in categories table
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.subcategories) AS subcategory_id
        LEFT JOIN categories ON categories.id = subcategory_id
        WHERE categories.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory ID found';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_subcategories() OWNER TO postgres;

--
-- Name: validate_event_tag(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_tag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
    tag_subcategories UUID[];
    event_subcategories UUID[];
BEGIN
    -- Get tag info
    SELECT type, possible_values, subcategories INTO tag_type_val, possible_values_arr, tag_subcategories
    FROM tags WHERE id = NEW.tag_id;
    
    -- Get event subcategories
    SELECT subcategories INTO event_subcategories
    FROM events WHERE id = NEW.event_id;
    
    -- Validate tag values based on type
    IF tag_type_val = 'boolean' THEN
        IF array_length(NEW.tag_values, 1) != 1 OR NEW.tag_values[1] NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag must have exactly one value: true or false';
        END IF;
    ELSIF tag_type_val = 'categorical' AND possible_values_arr IS NOT NULL THEN
        IF NOT (SELECT bool_and(val = ANY(possible_values_arr)) FROM unnest(NEW.tag_values) AS val) THEN
            RAISE EXCEPTION 'Categorical tag values must be from the possible values list';
        END IF;
    END IF;
    
    -- Validate that tag is applicable to at least one of event's subcategories
    IF NOT (
        SELECT EXISTS (
            SELECT 1 
            FROM unnest(event_subcategories) AS event_subcat
            WHERE event_subcat = ANY(tag_subcategories)
        )
    ) THEN
        RAISE EXCEPTION 'Tag is not applicable to any of the event subcategories';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_tag() OWNER TO postgres;

--
-- Name: validate_event_tag_values(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_tag_values() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    valid_values TEXT[];
BEGIN
    -- Get possible values for the tag
    SELECT possible_values INTO valid_values
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are valid
    IF NOT (SELECT bool_and(val = ANY(valid_values)) 
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'All selected values must be from the tag''s possible values';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_tag_values() OWNER TO postgres;

--
-- Name: validate_subcategory_reference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_subcategory_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.subcategory_id AND parent_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory: must reference a category with a parent';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_subcategory_reference() OWNER TO postgres;

--
-- Name: validate_tag_values(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_tag_values() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    possible_values_arr TEXT[];
BEGIN
    -- Get possible values for this tag
    SELECT possible_values INTO possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are in the possible values array
    IF NOT (SELECT bool_and(val = ANY(possible_values_arr))
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'Invalid tag values. Values must be among the tag''s possible values.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_tag_values() OWNER TO postgres;

--
-- Name: validate_user_tag_preference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_user_tag_preference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
BEGIN
    SELECT type, possible_values INTO tag_type_val, possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    IF tag_type_val = 'boolean' THEN
        IF NEW.value NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag value must be either "true" or "false"';
        END IF;
    ELSIF tag_type_val = 'categorical' THEN
        IF NOT (NEW.value = ANY(possible_values_arr)) THEN
            RAISE EXCEPTION 'Categorical tag value must be one of the possible values';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_user_tag_preference() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    login character varying(255) NOT NULL,
    password_hash text NOT NULL,
    last_login timestamp without time zone,
    is_active boolean DEFAULT true,
    role character varying(20) DEFAULT 'ADMIN'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: event_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_tags (
    event_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_tags OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_description text NOT NULL,
    long_description text,
    image_urls text[] DEFAULT '{}'::text[],
    links text[] DEFAULT '{}'::text[],
    event_dates timestamp with time zone[] NOT NULL,
    address text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_free boolean DEFAULT true NOT NULL,
    price_range jsonb,
    subcategories uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    display_dates boolean DEFAULT true NOT NULL,
    CONSTRAINT short_description_length_check CHECK ((length(short_description) <= 160))
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    category_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: swipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.swipes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    event_id uuid,
    direction public.swipe_direction NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.swipes OWNER TO postgres;

--
-- Name: tag_subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tag_subcategories (
    tag_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tag_subcategories OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    possible_values text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subcategories uuid[] DEFAULT '{}'::uuid[]
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: tags_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags_categories (
    tag_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags_categories OWNER TO postgres;

--
-- Name: user_category_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_category_preferences (
    id integer NOT NULL,
    user_id uuid,
    subcategory_id uuid,
    level integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_category_preferences_level_check CHECK (((level >= 0) AND (level <= 2)))
);


ALTER TABLE public.user_category_preferences OWNER TO postgres;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_category_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_category_preferences_id_seq OWNER TO postgres;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_category_preferences_id_seq OWNED BY public.user_category_preferences.id;


--
-- Name: user_tag_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tag_preferences (
    id integer NOT NULL,
    user_id uuid,
    tag_id uuid,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_tag_preferences OWNER TO postgres;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_tag_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_tag_preferences_id_seq OWNER TO postgres;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_tag_preferences_id_seq OWNED BY public.user_tag_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    telegram_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    temp_id uuid DEFAULT public.uuid_generate_v4(),
    last_active_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: user_category_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_category_preferences_id_seq'::regclass);


--
-- Name: user_tag_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_tag_preferences_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, login, password_hash, last_login, is_active, role, created_at, updated_at) FROM stdin;
5c7da46e-e568-416e-ab20-605758e3c32c	admin	$2b$10$3IXhqHgGZnxTXgLJJcJ8L.Ld9Qz7gkO7OHvwxvhxvyWtGDGrwykPi	2025-03-09 09:11:58.957114	t	ADMIN	2025-03-09 08:40:45.367984	2025-03-09 09:11:58.957114
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, parent_id, created_at, updated_at, is_active, display_order) FROM stdin;
b4c65b23-626a-42e8-853d-f68410eb0b8a	Бои	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
405b21f9-2157-4256-b261-16497fa31638	Игровой досуг	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
06a3c28f-0b19-4088-bb1a-d8d692135436	Кино	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
52e5a58b-a627-4f43-8f12-79bf08ee3cb5	Клубы, бары, рюмочные	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
ea6f91da-f8ee-4159-a702-eb042e246404	Концерты	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0852	Культура	\N	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0853	Развлечения	\N	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
bb4fd575-53d3-4c92-8c8a-a175a718033d	Рестораны, кафе	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0851	Спорт	\N	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
4affb85f-6b8a-42c6-a832-1d57b568c0e4	Стендапы	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
dcaf0251-ffaa-4582-b241-af7a3b630ff5	Театры	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
087cf0ae-8dd9-4ec1-a578-e2f494ad28c7	Теннис	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
ebe690b6-1fe7-4f1d-9468-1a0c06b1ed7e	Футбол	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
daabcc92-0baf-4308-bce8-1dd65da03c8c	Хоккей	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-09 08:40:45.374883+00	t	10
\.


--
-- Data for Name: event_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_tags (event_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
14fee45b-7634-424e-82d8-2b4ab2691525	45cf1f67-d46e-4ea7-8197-e6051002e29f	{1,2}	2025-03-09 09:17:17.751745+00	2025-03-09 09:17:17.751745+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, name, short_description, long_description, image_urls, links, event_dates, address, is_active, is_free, price_range, subcategories, created_at, updated_at, display_dates) FROM stdin;
14fee45b-7634-424e-82d8-2b4ab2691525	fghjk	fghjk	fghjk	{http://localhost:3002/uploads/events/1741511837728-1741511837725-869957844.png}	{https://apple.com}	{"2025-03-09 09:17:06.703+00"}	fghjkl	t	t	\N	{ea6f91da-f8ee-4159-a702-eb042e246404}	2025-03-09 09:17:17.78+00	2025-03-09 09:17:17.78+00	t
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, name, executed_at) FROM stdin;
1	000_create_extensions.sql	2025-03-09 08:40:45.273309
2	001_create_update_function.sql	2025-03-09 08:40:45.283597
3	001_create_update_timestamp_function.sql	2025-03-09 08:40:45.324306
4	002_create_users_table.sql	2025-03-09 08:40:45.325869
5	002a_create_users_table.sql	2025-03-09 08:40:45.328808
6	003_create_categories_table.sql	2025-03-09 08:40:45.329633
7	004_create_events_table.sql	2025-03-09 08:40:45.33634
8	004a_create_events_indexes.sql	2025-03-09 08:40:45.33975
9	005_create_tags_table.sql	2025-03-09 08:40:45.350231
10	008_create_admin_table.sql	2025-03-09 08:40:45.358559
11	009_create_swipes_and_preferences.sql	2025-03-09 08:40:45.361055
12	010_add_initial_admin.sql	2025-03-09 08:40:45.367984
13	011_create_sessions_table.sql	2025-03-09 08:40:45.371841
14	012_add_category_columns.sql	2025-03-09 08:40:45.374883
15	013_update_tags_for_multiple_categories.sql	2025-03-09 08:40:45.37974
16	014_add_is_active_to_tags.sql	2025-03-09 08:40:45.3823
17	015_fix_tag_categories_trigger.sql	2025-03-09 08:40:45.384352
18	016_fix_tags_structure.sql	2025-03-09 08:40:45.388748
19	016_remove_tag_categories_trigger.sql	2025-03-09 08:40:45.390286
20	017_add_tag_category_validation.sql	2025-03-09 08:40:45.39162
21	017_fix_tags_columns.sql	2025-03-09 08:40:45.403596
22	018_add_tag_categories_constraints.sql	2025-03-09 08:40:45.404526
23	019_remove_tag_categories.sql	2025-03-09 08:40:45.406809
24	020_fix_event_columns.sql	2025-03-09 08:40:45.420112
25	021_fix_event_tags.sql	2025-03-09 08:40:45.428421
26	021_update_tag_system.sql	2025-03-09 08:40:45.43466
27	022_add_event_subcategories.sql	2025-03-09 08:40:45.436364
28	023_setup_event_tags.sql	2025-03-09 08:40:45.444201
29	024_create_events_table.sql	2025-03-09 08:40:45.454133
30	025_add_device_id_to_users.sql	2025-03-09 08:40:45.467681
31	025_create_users_with_device_id.sql	2025-03-09 08:40:45.46872
32	026_modify_users_table.sql	2025-03-09 08:40:45.471658
33	028_update_subcategory_names.sql	2025-03-09 08:40:45.472668
34	029_revert_subcategory_names.sql	2025-03-09 08:40:45.477096
35	030_add_tag_subcategories.sql	2025-03-09 08:40:45.481472
36	031_create_subcategories_table.sql	2025-03-09 08:40:45.483505
37	031_fix_event_tags_table.sql	2025-03-09 08:40:45.489823
38	031a_update_tag_system.sql	2025-03-09 08:40:45.499844
39	032_simplify_users_table.sql	2025-03-09 08:40:45.509136
40	033_create_tag_preferences.sql	2025-03-09 08:40:45.511226
41	034_sync_user_preferences.sql	2025-03-09 08:40:45.52487
42	034a_add_tag_validation.sql	2025-03-09 08:40:45.528319
43	035_fix_user_id_types.sql	2025-03-09 08:40:45.541928
44	036_update_preferences_table.sql	2025-03-09 08:40:45.545506
45	036_update_preferences_to_use_subcategories.sql	2025-03-09 08:40:45.550492
46	037_fix_preferences_foreign_key.sql	2025-03-09 08:40:45.553726
47	038_rename_preference_level_column.sql	2025-03-09 08:40:45.555184
48	039_add_subcategory_display_order.sql	2025-03-09 08:40:45.557485
49	039_fix_preferences_column_and_constraints.sql	2025-03-09 08:40:45.560509
50	040_fix_preferences_table_structure.sql	2025-03-09 08:40:45.56991
51	040_update_level_constraint.sql	2025-03-09 08:40:45.573038
52	041_fix_category_preferences_fk.sql	2025-03-09 08:40:45.573817
53	041_remove_is_active_from_subcategories.sql	2025-03-09 08:40:45.579936
54	042_add_display_order_to_subcategories.sql	2025-03-09 08:40:45.584474
55	043_update_events_for_optional_dates.sql	2025-03-09 08:40:45.585537
56	044_make_long_description_optional.sql	2025-03-09 08:40:45.589369
57	045_limit_short_description_length.sql	2025-03-09 08:40:45.591263
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, token, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subcategories (id, name, category_id, created_at, updated_at, display_order) FROM stdin;
\.


--
-- Data for Name: swipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.swipes (id, user_id, event_id, direction, created_at, updated_at) FROM stdin;
8c35639f-268c-4409-adcb-2fb6523f5c2a	ba360b6c-778f-4f99-987a-8b3ad0dd5f99	14fee45b-7634-424e-82d8-2b4ab2691525	right	2025-03-09 09:22:06.953902+00	2025-03-09 09:22:06.953902+00
\.


--
-- Data for Name: tag_subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tag_subcategories (tag_id, subcategory_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, possible_values, is_active, created_at, updated_at, subcategories) FROM stdin;
45cf1f67-d46e-4ea7-8197-e6051002e29f	w	{1,2,3}	t	2025-03-09 09:12:11.046538+00	2025-03-09 09:12:11.046538+00	{}
\.


--
-- Data for Name: tags_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags_categories (tag_id, category_id, created_at, updated_at) FROM stdin;
45cf1f67-d46e-4ea7-8197-e6051002e29f	ea6f91da-f8ee-4159-a702-eb042e246404	2025-03-09 09:12:11.046538+00	2025-03-09 09:12:11.046538+00
\.


--
-- Data for Name: user_category_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_category_preferences (id, user_id, subcategory_id, level, created_at, updated_at) FROM stdin;
1	28406455-fed5-481e-ac26-3ddb5da64571	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-09 08:41:49.884645+00	2025-03-09 08:41:49.884645+00
2	28406455-fed5-481e-ac26-3ddb5da64571	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-09 08:41:49.884645+00	2025-03-09 08:41:49.884645+00
3	28406455-fed5-481e-ac26-3ddb5da64571	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-09 08:41:49.884645+00	2025-03-09 08:41:49.884645+00
6	ba360b6c-778f-4f99-987a-8b3ad0dd5f99	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-09 09:13:15.428797+00	2025-03-09 09:13:15.428797+00
7	ba360b6c-778f-4f99-987a-8b3ad0dd5f99	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-09 09:13:15.428797+00	2025-03-09 09:13:15.428797+00
8	ba360b6c-778f-4f99-987a-8b3ad0dd5f99	ebe690b6-1fe7-4f1d-9468-1a0c06b1ed7e	1	2025-03-09 09:13:15.428797+00	2025-03-09 09:13:15.428797+00
\.


--
-- Data for Name: user_tag_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tag_preferences (id, user_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
1	ba360b6c-778f-4f99-987a-8b3ad0dd5f99	45cf1f67-d46e-4ea7-8197-e6051002e29f	{1}	2025-03-09 09:13:17.087684+00	2025-03-09 09:13:17.087684+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, created_at, updated_at, temp_id, last_active_at) FROM stdin;
28406455-fed5-481e-ac26-3ddb5da64571	567876545	2025-03-09 08:41:44.945445+00	2025-03-09 08:41:44.945445+00	d084dd41-4354-4c7e-8eb0-3e3059945d0a	2025-03-09 08:41:44.945445+00
ba360b6c-778f-4f99-987a-8b3ad0dd5f99	64738920	2025-03-09 09:13:05.692407+00	2025-03-09 09:13:05.692407+00	c3a7be8f-0a99-496b-a12b-abbf7e193067	2025-03-09 09:13:05.692407+00
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 57, true);


--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_category_preferences_id_seq', 8, true);


--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_tag_preferences_id_seq', 1, true);


--
-- Name: admins admins_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_login_key UNIQUE (login);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: event_tags event_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: swipes swipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_pkey PRIMARY KEY (id);


--
-- Name: tag_subcategories tag_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_pkey PRIMARY KEY (tag_id, subcategory_id);


--
-- Name: tags_categories tags_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_pkey PRIMARY KEY (tag_id, category_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_user_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);


--
-- Name: user_tag_preferences user_tag_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_tag_preferences user_tag_preferences_user_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_tag_id_key UNIQUE (user_id, tag_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: users users_temp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_temp_id_key UNIQUE (temp_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_event_tags_values; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_tags_values ON public.event_tags USING gin (selected_values);


--
-- Name: idx_events_subcategories; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_subcategories ON public.events USING gin (subcategories);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_subcategories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_category_id ON public.subcategories USING btree (category_id);


--
-- Name: idx_swipes_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_direction ON public.swipes USING btree (direction);


--
-- Name: idx_swipes_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_event_id ON public.swipes USING btree (event_id);


--
-- Name: idx_swipes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_user_id ON public.swipes USING btree (user_id);


--
-- Name: idx_tag_subcategories_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tag_subcategories_subcategory_id ON public.tag_subcategories USING btree (subcategory_id);


--
-- Name: idx_tags_categories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_categories_category_id ON public.tags_categories USING btree (category_id);


--
-- Name: idx_tags_categories_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_categories_tag_id ON public.tags_categories USING btree (tag_id);


--
-- Name: idx_tags_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_is_active ON public.tags USING btree (is_active);


--
-- Name: idx_tags_possible_values; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_possible_values ON public.tags USING gin (possible_values);


--
-- Name: idx_tags_subcategories; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_subcategories ON public.tags USING gin (subcategories);


--
-- Name: idx_user_tag_preferences_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tag_preferences_tag_id ON public.user_tag_preferences USING btree (tag_id);


--
-- Name: idx_user_tag_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tag_preferences_user_id ON public.user_tag_preferences USING btree (user_id);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: sessions cleanup_expired_sessions_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER cleanup_expired_sessions_trigger AFTER INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.cleanup_expired_sessions();


--
-- Name: user_category_preferences ensure_subcategory_reference; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ensure_subcategory_reference BEFORE INSERT OR UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.validate_subcategory_reference();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_tags update_event_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_event_tags_updated_at BEFORE UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_events_updated_at_trigger BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_events_updated_at();


--
-- Name: subcategories update_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: swipes update_swipes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_swipes_updated_at BEFORE UPDATE ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tag_subcategories update_tag_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tag_subcategories_updated_at BEFORE UPDATE ON public.tag_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags_categories update_tags_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_categories_updated_at BEFORE UPDATE ON public.tags_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags update_tags_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_timestamp BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: tags update_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_category_preferences update_user_category_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_category_preferences_updated_at BEFORE UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_tag_preferences update_user_tag_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_tag_preferences_updated_at BEFORE UPDATE ON public.user_tag_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_last_active; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_last_active BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_last_active_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events validate_event_subcategories_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_event_subcategories_trigger BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_subcategories();


--
-- Name: event_tags validate_event_tag_values; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_event_tag_values BEFORE INSERT OR UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.validate_event_tag_values();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: event_tags event_tags_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_tags event_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: swipes swipes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

