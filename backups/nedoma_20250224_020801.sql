--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Homebrew)
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
-- Name: swipe_direction; Type: TYPE; Schema: public; Owner: grigorii
--

CREATE TYPE public.swipe_direction AS ENUM (
    'left',
    'right',
    'up'
);


ALTER TYPE public.swipe_direction OWNER TO grigorii;

--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_expired_sessions() OWNER TO grigorii;

--
-- Name: sync_from_tags_subcategories(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.sync_from_tags_subcategories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Delete old associations
        DELETE FROM tag_subcategories WHERE tag_id = NEW.id;
        
        -- Insert new associations
        IF NEW.subcategories IS NOT NULL THEN
            INSERT INTO tag_subcategories (tag_id, subcategory_id)
            SELECT NEW.id, unnest(NEW.subcategories)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.sync_from_tags_subcategories() OWNER TO grigorii;

--
-- Name: sync_tag_subcategories(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.sync_tag_subcategories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- When inserting/updating tag_subcategories, update tags.subcategories array
        UPDATE tags 
        SET subcategories = (
            SELECT array_agg(subcategory_id)
            FROM tag_subcategories
            WHERE tag_id = NEW.tag_id
        )
        WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- When deleting from tag_subcategories, update tags.subcategories array
        UPDATE tags 
        SET subcategories = (
            SELECT array_agg(subcategory_id)
            FROM tag_subcategories
            WHERE tag_id = OLD.tag_id
        )
        WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.sync_tag_subcategories() OWNER TO grigorii;

--
-- Name: update_event_tags_updated_at(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.update_event_tags_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_event_tags_updated_at() OWNER TO grigorii;

--
-- Name: update_events_updated_at(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.update_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_events_updated_at() OWNER TO grigorii;

--
-- Name: update_last_active_at(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.update_last_active_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_active_at() OWNER TO grigorii;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO grigorii;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO grigorii;

--
-- Name: validate_event_subcategories(); Type: FUNCTION; Schema: public; Owner: grigorii
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


ALTER FUNCTION public.validate_event_subcategories() OWNER TO grigorii;

--
-- Name: validate_event_tag(); Type: FUNCTION; Schema: public; Owner: grigorii
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


ALTER FUNCTION public.validate_event_tag() OWNER TO grigorii;

--
-- Name: validate_event_tag_values(); Type: FUNCTION; Schema: public; Owner: grigorii
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


ALTER FUNCTION public.validate_event_tag_values() OWNER TO grigorii;

--
-- Name: validate_tag_value(); Type: FUNCTION; Schema: public; Owner: grigorii
--

CREATE FUNCTION public.validate_tag_value() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tags 
        WHERE id = NEW.tag_id 
        AND NEW.value = ANY(possible_values)
    ) THEN
        RAISE EXCEPTION 'Invalid tag value. Value must be one of the tag''s possible values.';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_tag_value() OWNER TO grigorii;

--
-- Name: validate_tag_values(); Type: FUNCTION; Schema: public; Owner: grigorii
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


ALTER FUNCTION public.validate_tag_values() OWNER TO grigorii;

--
-- Name: validate_user_tag_preference(); Type: FUNCTION; Schema: public; Owner: grigorii
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


ALTER FUNCTION public.validate_user_tag_preference() OWNER TO grigorii;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: grigorii
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


ALTER TABLE public.admins OWNER TO grigorii;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: grigorii
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


ALTER TABLE public.categories OWNER TO grigorii;

--
-- Name: event_tags; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.event_tags (
    event_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_tags OWNER TO grigorii;

--
-- Name: events; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_description text NOT NULL,
    long_description text NOT NULL,
    image_urls text[] DEFAULT '{}'::text[],
    links text[] DEFAULT '{}'::text[],
    relevance_start timestamp with time zone NOT NULL,
    event_dates timestamp with time zone[] NOT NULL,
    address text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_free boolean DEFAULT true NOT NULL,
    price_range jsonb,
    subcategories uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.events OWNER TO grigorii;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.migrations OWNER TO grigorii;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: grigorii
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO grigorii;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: grigorii
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO grigorii;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subcategories OWNER TO grigorii;

--
-- Name: swipes; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.swipes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    event_id uuid,
    direction public.swipe_direction NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.swipes OWNER TO grigorii;

--
-- Name: tag_groups; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.tag_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tag_groups OWNER TO grigorii;

--
-- Name: tag_groups_subcategories; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.tag_groups_subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_group_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tag_groups_subcategories OWNER TO grigorii;

--
-- Name: tag_subcategories; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.tag_subcategories (
    tag_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tag_subcategories OWNER TO grigorii;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    possible_values text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags OWNER TO grigorii;

--
-- Name: tags_categories; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.tags_categories (
    tag_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags_categories OWNER TO grigorii;

--
-- Name: user_category_preferences; Type: TABLE; Schema: public; Owner: grigorii
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


ALTER TABLE public.user_category_preferences OWNER TO grigorii;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: grigorii
--

CREATE SEQUENCE public.user_category_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_category_preferences_id_seq OWNER TO grigorii;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: grigorii
--

ALTER SEQUENCE public.user_category_preferences_id_seq OWNED BY public.user_category_preferences.id;


--
-- Name: user_subcategory_preferences; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.user_subcategory_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    preference_level integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_subcategory_preferences_preference_level_check CHECK (((preference_level >= 0) AND (preference_level <= 2)))
);


ALTER TABLE public.user_subcategory_preferences OWNER TO grigorii;

--
-- Name: user_tag_preferences; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.user_tag_preferences (
    id integer NOT NULL,
    user_id uuid,
    tag_id uuid,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_tag_preferences OWNER TO grigorii;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: grigorii
--

CREATE SEQUENCE public.user_tag_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_tag_preferences_id_seq OWNER TO grigorii;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: grigorii
--

ALTER SEQUENCE public.user_tag_preferences_id_seq OWNED BY public.user_tag_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: grigorii
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO grigorii;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: user_category_preferences id; Type: DEFAULT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_category_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_category_preferences_id_seq'::regclass);


--
-- Name: user_tag_preferences id; Type: DEFAULT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_tag_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_tag_preferences_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.admins (id, login, password_hash, last_login, is_active, role, created_at, updated_at) FROM stdin;
62945624-2276-4aa1-aece-acfca2ff71d1	admin	$2b$10$RmAyZWu4Y2hx4L5qq8CkjutlUJy9iBkfVdIwFCIhs8EdVIPgPlSuy	2025-02-14 13:18:07.724501	t	ADMIN	2025-02-12 08:57:54.048948	2025-02-14 13:18:07.724501
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.categories (id, name, parent_id, created_at, updated_at, is_active, display_order) FROM stdin;
d290f1ee-6c54-4b01-90e6-d701748f0852	Культура	\N	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	10
d290f1ee-6c54-4b01-90e6-d701748f0853	Развлечения	\N	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	20
d290f1ee-6c54-4b01-90e6-d701748f0851	Спорт	\N	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	30
d735d5ec-5438-4644-a6cc-382c33314415	Бои	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	31
88b26b23-820e-4cab-a0c2-f2d6a50e68c9	Теннис	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	32
a46bb14c-7a9c-4c5e-acf7-e4183de71e1e	Футбол	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	33
d1d7953c-990f-472a-9c00-50949b8e964a	Хоккей	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	34
218c4fee-2b30-4052-8c3b-ac77631261ab	Кино	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	11
c5b87c7e-b835-4224-9441-96b3059a1b83	Концерты	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	12
2e1208e8-49f1-4ce3-8d07-35d3f91988b4	Стендапы	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	13
873284ea-45d4-40ca-8098-a2579d5fc377	Театры	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	14
dda9a062-970d-49c8-8eb5-e5b33c976e41	Игровой досуг	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	21
e22924b9-9135-469c-b027-fffca037d569	Клубы, бары, рюмочные	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	22
ec46f867-8e47-41b8-9139-cb8b57997b46	Рестораны, кафе	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-02-12 08:57:09.26559+03	2025-02-12 08:57:54.0717+03	t	23
1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Спорт	\N	2025-02-12 14:04:25.542367+03	2025-02-12 20:26:13.387285+03	t	0
2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Культура	\N	2025-02-12 14:04:25.542367+03	2025-02-12 20:26:13.387285+03	t	0
3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Развлечения	\N	2025-02-12 14:04:25.542367+03	2025-02-12 20:26:13.387285+03	t	0
\.


--
-- Data for Name: event_tags; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.event_tags (event_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
1557390e-e733-4302-90bc-84736c81f47a	237ab577-0d23-4c62-89e3-23e6620bb458	{мюзикл}	2025-02-12 09:36:21.353404+03	2025-02-12 09:36:21.353404+03
2cc574ac-e872-44a7-9e0f-6d53a0dd20fa	891c6aec-4ffe-4106-befe-c5787b459764	{uuuuu}	2025-02-14 09:16:17.454259+03	2025-02-14 09:16:17.454259+03
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.events (id, name, short_description, long_description, image_urls, links, relevance_start, event_dates, address, is_active, is_free, price_range, subcategories, created_at, updated_at) FROM stdin;
63c51df9-aff2-48ca-95be-12a54716faf4	t	a	lalala	{http://localhost:3002/uploads/events/1739340654608-1739340654604-692502856.png}	{}	2025-02-12 09:07:16.495+03	{"2025-02-12 09:07:49.998+03"}	1	t	t	\N	{c5b87c7e-b835-4224-9441-96b3059a1b83}	2025-02-12 09:10:54.625+03	2025-02-12 09:10:54.625+03
1557390e-e733-4302-90bc-84736c81f47a	н	а	таша	{http://localhost:3002/uploads/events/1739342053802-1739342053796-593872412.png}	{}	2025-02-12 09:31:06.1+03	{"2025-02-12 09:33:58.687+03","2025-02-12 09:33:59.838+03","2025-02-12 09:34:00.272+03","2025-02-12 09:34:00.837+03","2025-02-12 09:34:01.337+03","2025-02-12 09:34:02.788+03","2025-02-12 09:34:03.189+03","2025-02-12 09:34:03.654+03","2025-02-12 09:34:04.088+03","2025-02-12 09:34:04.555+03"}	1	t	f	{"max": 15000, "min": 0}	{873284ea-45d4-40ca-8098-a2579d5fc377}	2025-02-12 09:34:13.812+03	2025-02-12 09:36:21.353404+03
1e4e6eac-dc5c-4777-aafa-72eb0b71af71	1	1	1	{http://localhost:3002/uploads/events/1739388528812-1739388528804-123858295.png}	{}	2025-02-12 22:28:27.284+03	{"2025-02-12 22:28:44.466+03"}	1	t	t	\N	{218c4fee-2b30-4052-8c3b-ac77631261ab}	2025-02-12 22:28:48.878+03	2025-02-12 22:28:48.878+03
4453957c-dfcb-472d-bd6b-1b7b77a0fc6b	yyyyy	uuuuu	ruururururuuru	{http://localhost:3002/uploads/events/1739513749575-1739513749567-227567418.png}	{}	2025-02-14 09:14:52.614+03	{"2025-02-14 09:15:33.647+03","2025-02-14 09:15:34.214+03","2025-02-14 09:15:34.646+03"}	yyy	t	t	\N	{88b26b23-820e-4cab-a0c2-f2d6a50e68c9}	2025-02-14 09:15:49.586+03	2025-02-14 09:15:49.586+03
2cc574ac-e872-44a7-9e0f-6d53a0dd20fa	yyyyy	uuuuu	fgjsnigrwjgi	{http://localhost:3002/uploads/events/1739513777450-1739513777440-875845153.png}	{}	2025-02-14 09:14:52.614+03	{"2025-02-14 09:16:10.713+03","2025-02-14 09:16:11.163+03","2025-02-14 09:16:11.847+03"}	1	t	t	\N	{88b26b23-820e-4cab-a0c2-f2d6a50e68c9}	2025-02-14 09:16:17.454+03	2025-02-14 09:16:17.454+03
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.migrations (id, name, executed_at) FROM stdin;
1	000_create_extensions.sql	2025-02-12 08:57:09.17208+03
2	001_create_update_function.sql	2025-02-12 08:57:09.244121+03
3	001_create_update_timestamp_function.sql	2025-02-12 08:57:09.253243+03
4	002_create_users_table.sql	2025-02-12 08:57:09.254218+03
5	003_create_categories_table.sql	2025-02-12 08:57:09.26559+03
6	004_create_events_table.sql	2025-02-12 08:57:09.289316+03
7	004a_create_events_indexes.sql	2025-02-12 08:57:09.294165+03
8	005_create_tags_table.sql	2025-02-12 08:57:09.329664+03
9	008_create_admin_table.sql	2025-02-12 08:57:09.338401+03
10	002a_create_users_table.sql	2025-02-12 08:57:54.027422+03
11	009_create_swipes_and_preferences.sql	2025-02-12 08:57:54.048031+03
12	010_add_initial_admin.sql	2025-02-12 08:57:54.048948+03
13	011_create_sessions_table.sql	2025-02-12 08:57:54.056048+03
14	012_add_category_columns.sql	2025-02-12 08:57:54.0717+03
15	013_update_tags_for_multiple_categories.sql	2025-02-12 08:57:54.107707+03
16	014_add_is_active_to_tags.sql	2025-02-12 08:57:54.108788+03
17	015_fix_tag_categories_trigger.sql	2025-02-12 08:57:54.112119+03
18	016_remove_tag_categories_trigger.sql	2025-02-12 08:57:54.117461+03
19	017_add_tag_category_validation.sql	2025-02-12 08:57:54.119086+03
20	018_add_tag_categories_constraints.sql	2025-02-12 08:57:54.121163+03
21	019_remove_tag_categories.sql	2025-02-12 08:57:54.121951+03
22	020_fix_event_columns.sql	2025-02-12 08:57:54.144793+03
23	021_fix_event_tags.sql	2025-02-12 08:57:54.156401+03
24	021_update_tag_system.sql	2025-02-12 08:57:54.162829+03
25	022_add_event_subcategories.sql	2025-02-12 08:57:54.164233+03
26	022_update_tag_system.sql	2025-02-12 08:57:54.175659+03
27	023_setup_event_tags.sql	2025-02-12 08:57:54.180153+03
28	024_create_events_table.sql	2025-02-12 08:57:54.190336+03
29	025_add_device_id_to_users.sql	2025-02-12 08:58:35.269557+03
30	025_create_users_with_device_id.sql	2025-02-12 08:58:35.271307+03
31	026_modify_users_table.sql	2025-02-12 08:59:50.999491+03
32	028_update_subcategory_names.sql	2025-02-12 09:00:40.658853+03
33	029_revert_subcategory_names.sql	2025-02-12 09:00:40.668984+03
34	030_add_tag_subcategories.sql	2025-02-12 09:07:12.00281+03
35	031_fix_event_tags_table.sql	2025-02-12 09:10:46.843851+03
36	032_cleanup_and_update_users.sql	2025-02-12 13:56:55.17007+03
37	033_create_subcategories_table.sql	2025-02-12 13:56:55.211423+03
38	034_fix_tag_system_trigger.sql	2025-02-12 13:56:55.222008+03
39	035_fix_tag_system_migration.sql	2025-02-12 13:56:55.228421+03
41	037_update_user_tag_system.sql	2025-02-12 14:00:26.891121+03
44	036_create_user_preference_tables.sql	2025-02-12 14:04:25.498974+03
45	037_create_tag_subcategories_table.sql	2025-02-12 14:04:25.535144+03
46	038_update_user_tag_system.sql	2025-02-12 14:04:25.541646+03
47	039_add_test_data.sql	2025-02-12 14:04:25.547567+03
48	037_create_base_categories.sql	2025-02-12 20:25:20.733535+03
49	038_create_test_subcategories.sql	2025-02-12 20:25:20.742057+03
50	040_create_tag_groups.sql	2025-02-12 20:25:20.796388+03
51	036_create_base_categories.sql	2025-02-12 20:26:13.393781+03
52	039_create_tag_subcategories_table.sql	2025-02-12 20:26:13.421936+03
53	040_revert_to_subcategories_array.sql	2025-02-12 20:26:13.426684+03
54	016_fix_tags_structure.sql	2025-02-14 09:10:16.615454+03
55	017_fix_tags_columns.sql	2025-02-14 09:14:32.058953+03
56	022b_update_tag_system.sql	2025-02-24 06:27:34.50909+03
57	032_simplify_users_table.sql	2025-02-24 06:27:34.568085+03
58	033_create_tag_preferences.sql	2025-02-24 06:27:34.569934+03
59	034_sync_user_preferences.sql	2025-02-24 06:27:34.588687+03
60	035_fix_user_id_types.sql	2025-02-24 06:27:34.630262+03
61	031_create_subcategories_table.sql	2025-02-24 06:31:25.621939+03
62	031a_update_tag_system.sql	2025-02-24 06:31:27.829197+03
63	034a_add_tag_validation.sql	2025-02-24 06:31:27.952502+03
64	036_update_preferences_table.sql	2025-02-24 06:31:27.96998+03
65	036_update_preferences_to_use_subcategories.sql	2025-02-24 06:31:27.982308+03
66	037_fix_preferences_foreign_key.sql	2025-02-24 06:31:27.997379+03
67	038_rename_preference_level_column.sql	2025-02-24 06:31:28.000583+03
68	039_fix_preferences_column_and_constraints.sql	2025-02-24 06:31:28.019463+03
69	040_fix_preferences_table_structure.sql	2025-02-24 06:31:28.177527+03
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.sessions (id, user_id, token, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.subcategories (id, name, category_id, created_at, updated_at) FROM stdin;
02ea8d17-1fb1-451e-ba9d-e3cb080bad12	Футбол	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
f3af1159-011b-4984-9b15-d6c81dd07822	Теннис	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
7dd1d72f-1d92-4a2a-bade-9eaec6f52862	Бои	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
f1db1efc-d1fa-4573-9a4f-b8fa0e973d80	Хоккей	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
3acc2beb-5ca0-47ef-a897-b8c5cf18b1af	Театры	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
2b0a73cc-370b-41d9-adbe-8ebf66067801	Кино	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
8fadf24e-ca92-4478-aad8-d6f479955019	Концерты	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
4bc5ffe5-4364-44f9-be1d-90a318ec01f0	Стендапы	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
faeafb12-f749-4a6e-8f3a-bbbb69d59ce8	Кафе	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
1efac1b7-3b59-451e-8438-37f550a81415	Клубы	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
0f31c406-a334-4564-9bac-3ca9400b4717	Квесты	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-02-12 13:56:55.173773+03	2025-02-12 13:56:55.173773+03
4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Футбол	1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 14:04:25.542367+03	2025-02-12 20:25:20.737454+03
5b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Теннис	1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 14:04:25.542367+03	2025-02-12 20:25:20.737454+03
6b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Бои	1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 14:04:25.542367+03	2025-02-12 20:25:20.737454+03
7b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Хоккей	1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 14:04:25.542367+03	2025-02-12 20:25:20.737454+03
8b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Театры	2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 14:04:25.542367+03	2025-02-12 20:25:20.737454+03
9b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Кино	2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 14:04:25.542367+03	2025-02-12 20:25:20.737454+03
ab9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Концерты	2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.737454+03	2025-02-12 20:25:20.737454+03
bb9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Стендапы	2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.737454+03	2025-02-12 20:25:20.737454+03
cb9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Кафе	3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.737454+03	2025-02-12 20:25:20.737454+03
db9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Клубы	3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.737454+03	2025-02-12 20:25:20.737454+03
eb9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Квесты	3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.737454+03	2025-02-12 20:25:20.737454+03
\.


--
-- Data for Name: swipes; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.swipes (id, user_id, event_id, direction, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tag_groups; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.tag_groups (id, name, created_at, updated_at) FROM stdin;
1d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Театральный жанр	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
2d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Футбольные турниры	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
3d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Хоккейные лиги	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
4d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	Киножанры	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
\.


--
-- Data for Name: tag_groups_subcategories; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.tag_groups_subcategories (id, tag_group_id, subcategory_id, created_at, updated_at) FROM stdin;
da69675f-bb9a-4ed5-ad1b-2670e6a1cc94	1d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	7b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
ffd29b1e-03a9-4a47-bc8c-210ec735e558	2d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
3cfc15f5-ac10-4725-9be4-d08e6271ef1c	3d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	5b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
39161751-59f3-4c49-b126-baab6beb998c	4d9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	6b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2025-02-12 20:25:20.743392+03	2025-02-12 20:25:20.743392+03
\.


--
-- Data for Name: tag_subcategories; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.tag_subcategories (tag_id, subcategory_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.tags (id, name, possible_values, is_active, created_at, updated_at) FROM stdin;
891c6aec-4ffe-4106-befe-c5787b459764	yyy	{uuu,uuuuu}	t	2025-02-14 09:15:03.056529+03	2025-02-14 09:15:03.056529+03
e0a98384-d938-4ae8-8963-34f6c4f907dd	ttt	{rrr,uuu}	t	2025-02-14 10:00:35.509512+03	2025-02-14 10:00:35.509512+03
\.


--
-- Data for Name: tags_categories; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.tags_categories (tag_id, category_id, created_at, updated_at) FROM stdin;
891c6aec-4ffe-4106-befe-c5787b459764	88b26b23-820e-4cab-a0c2-f2d6a50e68c9	2025-02-14 09:15:03.056529+03	2025-02-14 09:15:03.056529+03
e0a98384-d938-4ae8-8963-34f6c4f907dd	e22924b9-9135-469c-b027-fffca037d569	2025-02-14 10:00:35.509512+03	2025-02-14 10:00:35.509512+03
\.


--
-- Data for Name: user_category_preferences; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.user_category_preferences (id, user_id, subcategory_id, level, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_subcategory_preferences; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.user_subcategory_preferences (id, user_id, subcategory_id, preference_level, created_at, updated_at) FROM stdin;
ce72d85b-ffad-4671-a57e-42fbeab753de	10b72b8b-62d9-4880-98c6-c15cc6178642	4bc5ffe5-4364-44f9-be1d-90a318ec01f0	1	2025-02-12 14:04:51.666944+03	2025-02-12 14:04:51.666944+03
904b5b2f-d70a-4105-a591-1b28cf62391a	10b72b8b-62d9-4880-98c6-c15cc6178642	2b0a73cc-370b-41d9-adbe-8ebf66067801	1	2025-02-12 14:04:51.666944+03	2025-02-12 14:04:51.666944+03
bb5e4c7b-554f-45a1-8262-1246739049e7	10b72b8b-62d9-4880-98c6-c15cc6178642	3acc2beb-5ca0-47ef-a897-b8c5cf18b1af	1	2025-02-12 14:04:51.666944+03	2025-02-12 14:04:51.666944+03
833c85fb-9c96-45e2-a6de-0866183b932b	10b72b8b-62d9-4880-98c6-c15cc6178642	0f31c406-a334-4564-9bac-3ca9400b4717	1	2025-02-12 14:04:51.666944+03	2025-02-12 14:04:51.666944+03
7d1dd517-b687-4d04-b414-7c410420114c	10b72b8b-62d9-4880-98c6-c15cc6178642	02ea8d17-1fb1-451e-ba9d-e3cb080bad12	1	2025-02-12 14:04:51.666944+03	2025-02-12 14:04:51.666944+03
e23b904e-ad74-4aa8-a56c-3e3b4f6fc387	10b72b8b-62d9-4880-98c6-c15cc6178642	f1db1efc-d1fa-4573-9a4f-b8fa0e973d80	1	2025-02-12 14:04:51.666944+03	2025-02-12 14:04:51.666944+03
d1cc14f9-4273-4b6d-b62a-fd27ab1813b4	998ba4d5-a773-40e6-8293-e0aebce9c0fd	7b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 14:06:47.597585+03	2025-02-12 14:06:47.597585+03
ba905d28-11a8-451e-910c-6f781dd222f0	998ba4d5-a773-40e6-8293-e0aebce9c0fd	8fadf24e-ca92-4478-aad8-d6f479955019	1	2025-02-12 14:06:47.597585+03	2025-02-12 14:06:47.597585+03
ee47965d-719b-4444-ac5b-846a5ec10e4a	998ba4d5-a773-40e6-8293-e0aebce9c0fd	5b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 14:06:47.597585+03	2025-02-12 14:06:47.597585+03
32a7408e-1c03-4b25-86ce-17c69b34ea45	998ba4d5-a773-40e6-8293-e0aebce9c0fd	f1db1efc-d1fa-4573-9a4f-b8fa0e973d80	2	2025-02-12 14:06:47.597585+03	2025-02-12 14:06:47.597585+03
55b845a6-8d78-4ebe-a1cb-e35243b69e7f	7304abe6-ab76-498d-b9b4-cf2d4ddb1ade	4bc5ffe5-4364-44f9-be1d-90a318ec01f0	1	2025-02-12 14:12:44.119018+03	2025-02-12 14:12:44.119018+03
b1112c88-27ee-4bdc-bcfc-df8c97988d5d	7304abe6-ab76-498d-b9b4-cf2d4ddb1ade	4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 14:12:44.119018+03	2025-02-12 14:12:44.119018+03
8b2b9f77-2c6e-4b46-bd9a-13a6cfb258c9	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	8fadf24e-ca92-4478-aad8-d6f479955019	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
a985c6bf-e0ee-4fab-8075-b630de3a5d55	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	eb9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	2	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
cb4563f7-4608-4d64-8f8e-e9bc943f78ed	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	db9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
8dab969e-4e29-43f8-92aa-beeba757382a	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	1efac1b7-3b59-451e-8438-37f550a81415	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
bf008b69-bce8-40d3-a560-f70efcfbb6dd	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	faeafb12-f749-4a6e-8f3a-bbbb69d59ce8	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
3ddc5e97-1472-4078-bdde-35bcb4200770	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
b517d6e1-267f-4183-b52b-4dca9be98b86	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	6b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
fd1774b7-8d5c-453d-b99f-d054ec89fcb6	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	5b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
655710a9-3d04-4958-bbc9-81e13a6db229	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	02ea8d17-1fb1-451e-ba9d-e3cb080bad12	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
ba33319f-a49f-438c-b4fb-5498f1313751	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	7dd1d72f-1d92-4a2a-bade-9eaec6f52862	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
f0705836-8ae6-4443-9f97-0776289e334b	c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	f3af1159-011b-4984-9b15-d6c81dd07822	1	2025-02-12 21:56:28.184522+03	2025-02-12 21:56:28.184522+03
\.


--
-- Data for Name: user_tag_preferences; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.user_tag_preferences (id, user_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: grigorii
--

COPY public.users (id, telegram_id, created_at, updated_at) FROM stdin;
10b72b8b-62d9-4880-98c6-c15cc6178642	10000	2025-02-12 14:04:41.513211+03	2025-02-12 14:04:41.513211+03
998ba4d5-a773-40e6-8293-e0aebce9c0fd	11111	2025-02-12 14:05:20.462579+03	2025-02-12 14:05:20.462579+03
7304abe6-ab76-498d-b9b4-cf2d4ddb1ade	111110	2025-02-12 14:12:37.165245+03	2025-02-12 14:12:37.165245+03
c13ac11b-c58a-4fb8-b01e-ca7c71dd7c2a	1111100	2025-02-12 14:25:00.136853+03	2025-02-12 14:25:00.136853+03
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: grigorii
--

SELECT pg_catalog.setval('public.migrations_id_seq', 69, true);


--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: grigorii
--

SELECT pg_catalog.setval('public.user_category_preferences_id_seq', 1, false);


--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: grigorii
--

SELECT pg_catalog.setval('public.user_tag_preferences_id_seq', 1, false);


--
-- Name: admins admins_login_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_login_key UNIQUE (login);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: event_tags event_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: swipes swipes_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_pkey PRIMARY KEY (id);


--
-- Name: tag_groups tag_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_groups
    ADD CONSTRAINT tag_groups_pkey PRIMARY KEY (id);


--
-- Name: tag_groups_subcategories tag_groups_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_groups_subcategories
    ADD CONSTRAINT tag_groups_subcategories_pkey PRIMARY KEY (id);


--
-- Name: tag_groups_subcategories tag_groups_subcategories_tag_group_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_groups_subcategories
    ADD CONSTRAINT tag_groups_subcategories_tag_group_id_subcategory_id_key UNIQUE (tag_group_id, subcategory_id);


--
-- Name: tag_subcategories tag_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_pkey PRIMARY KEY (tag_id, subcategory_id);


--
-- Name: tags_categories tags_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_pkey PRIMARY KEY (tag_id, category_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_user_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);


--
-- Name: user_subcategory_preferences user_subcategory_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_subcategory_preferences
    ADD CONSTRAINT user_subcategory_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_subcategory_preferences user_subcategory_preferences_user_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_subcategory_preferences
    ADD CONSTRAINT user_subcategory_preferences_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);


--
-- Name: user_tag_preferences user_tag_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_tag_preferences user_tag_preferences_user_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_tag_id_key UNIQUE (user_id, tag_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_event_tags_values; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_event_tags_values ON public.event_tags USING gin (selected_values);


--
-- Name: idx_events_relevance_start; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_events_relevance_start ON public.events USING btree (relevance_start);


--
-- Name: idx_events_subcategories; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_events_subcategories ON public.events USING gin (subcategories);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_subcategories_category_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_subcategories_category_id ON public.subcategories USING btree (category_id);


--
-- Name: idx_swipes_direction; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_swipes_direction ON public.swipes USING btree (direction);


--
-- Name: idx_swipes_event_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_swipes_event_id ON public.swipes USING btree (event_id);


--
-- Name: idx_swipes_user_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_swipes_user_id ON public.swipes USING btree (user_id);


--
-- Name: idx_tag_groups_subcategories_group_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_tag_groups_subcategories_group_id ON public.tag_groups_subcategories USING btree (tag_group_id);


--
-- Name: idx_tag_groups_subcategories_subcategory_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_tag_groups_subcategories_subcategory_id ON public.tag_groups_subcategories USING btree (subcategory_id);


--
-- Name: idx_tag_subcategories_subcategory_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_tag_subcategories_subcategory_id ON public.tag_subcategories USING btree (subcategory_id);


--
-- Name: idx_tags_categories_category_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_tags_categories_category_id ON public.tags_categories USING btree (category_id);


--
-- Name: idx_tags_categories_tag_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_tags_categories_tag_id ON public.tags_categories USING btree (tag_id);


--
-- Name: idx_tags_is_active; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_tags_is_active ON public.tags USING btree (is_active);


--
-- Name: idx_user_tag_preferences_selected_values; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_user_tag_preferences_selected_values ON public.user_tag_preferences USING gin (selected_values);


--
-- Name: idx_user_tag_preferences_tag_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_user_tag_preferences_tag_id ON public.user_tag_preferences USING btree (tag_id);


--
-- Name: idx_user_tag_preferences_user_id; Type: INDEX; Schema: public; Owner: grigorii
--

CREATE INDEX idx_user_tag_preferences_user_id ON public.user_tag_preferences USING btree (user_id);


--
-- Name: sessions cleanup_expired_sessions_trigger; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER cleanup_expired_sessions_trigger AFTER INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.cleanup_expired_sessions();


--
-- Name: tag_groups_subcategories set_tag_groups_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER set_tag_groups_subcategories_updated_at BEFORE UPDATE ON public.tag_groups_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tag_groups set_tag_groups_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER set_tag_groups_updated_at BEFORE UPDATE ON public.tag_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_subcategory_preferences set_user_subcategory_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER set_user_subcategory_preferences_updated_at BEFORE UPDATE ON public.user_subcategory_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users set_users_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_tags update_event_tags_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_event_tags_updated_at BEFORE UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_events_updated_at_trigger BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_events_updated_at();


--
-- Name: subcategories update_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: swipes update_swipes_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_swipes_updated_at BEFORE UPDATE ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tag_subcategories update_tag_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_tag_subcategories_updated_at BEFORE UPDATE ON public.tag_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags_categories update_tags_categories_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_tags_categories_updated_at BEFORE UPDATE ON public.tags_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags update_tags_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_category_preferences update_user_category_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_user_category_preferences_updated_at BEFORE UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_tag_preferences update_user_tag_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER update_user_tag_preferences_updated_at BEFORE UPDATE ON public.user_tag_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events validate_event_subcategories_trigger; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER validate_event_subcategories_trigger BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_subcategories();


--
-- Name: event_tags validate_event_tag_values; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER validate_event_tag_values BEFORE INSERT OR UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.validate_event_tag_values();


--
-- Name: user_tag_preferences validate_tag_values_trigger; Type: TRIGGER; Schema: public; Owner: grigorii
--

CREATE TRIGGER validate_tag_values_trigger BEFORE INSERT OR UPDATE ON public.user_tag_preferences FOR EACH ROW EXECUTE FUNCTION public.validate_tag_values();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: event_tags event_tags_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: tag_groups_subcategories tag_groups_subcategories_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_groups_subcategories
    ADD CONSTRAINT tag_groups_subcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: tag_groups_subcategories tag_groups_subcategories_tag_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_groups_subcategories
    ADD CONSTRAINT tag_groups_subcategories_tag_group_id_fkey FOREIGN KEY (tag_group_id) REFERENCES public.tag_groups(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subcategory_preferences user_subcategory_preferences_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_subcategory_preferences
    ADD CONSTRAINT user_subcategory_preferences_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: user_subcategory_preferences user_subcategory_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_subcategory_preferences
    ADD CONSTRAINT user_subcategory_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: grigorii
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

